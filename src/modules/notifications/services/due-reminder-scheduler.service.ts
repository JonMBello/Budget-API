import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { AccountCard, AccountCardDocument } from '../../cards/schemas/account-card.schema';
import { Expense, ExpenseDocument, ExpenseCategory } from '../../expenses/schemas/expense.schema';
import { Income, IncomeDocument, IncomeSource } from '../../incomes/schemas/income.schema';
import {
  NotificationLog,
  NotificationLogDocument,
  NotificationChannel,
  NotificationStatus,
  NotificationTargetType,
} from '../schemas/notification-log.schema';
import { WebPushService } from './web-push.service';
import { DueItem, EmailService } from './email.service';
import { AccountCardType } from '../../../common/utils/card-cycle.util';
import { SystemConfigService } from '../../system-config/system-config.service';

export interface UpcomingItem {
  targetType: NotificationTargetType;
  targetId: string;
  title: string;
  amount: number;
  dueDateStr: string;
  daysRemaining: number;
  itemType: 'CARD' | 'SERVICE' | 'DEBT_COLLECTION';
}

@Injectable()
export class DueReminderScheduler {
  private readonly logger = new Logger(DueReminderScheduler.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(AccountCard.name)
    private readonly cardModel: Model<AccountCardDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(NotificationLog.name)
    private readonly logModel: Model<NotificationLogDocument>,
    private readonly webPushService: WebPushService,
    private readonly emailService: EmailService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReminders(): Promise<void> {
    const isEnabled = await this.systemConfigService.isNotificationsEnabled();
    if (!isEnabled) {
      this.logger.log(
        'Daily due reminder cron job skipped: notifications are disabled by system config (NOTIFICATIONS_ENABLED=false).',
      );
      return;
    }

    this.logger.log('Starting daily due reminder cron job (08:00 AM)...');

    const users = await this.userModel.find({ isActive: true }).exec();

    for (const user of users) {
      try {
        await this.checkAndSendRemindersForUser(user);
      } catch (error: any) {
        this.logger.error(`Failed to process due reminders for user ${user._id}: ${error.message}`);
      }
    }

    this.logger.log('Daily due reminder cron job completed.');
  }

  async runManualCheck(userId: string): Promise<{
    success: boolean;
    message: string;
    detectedUpcomingCount: number;
    dispatchedAlertsCount: number;
    logs: NotificationLogDocument[];
  }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new Error('User not found');
    }

    const isEnabled = await this.systemConfigService.isNotificationsEnabled();
    if (!isEnabled) {
      const upcomingItems = await this.detectUpcomingDues(userId);
      this.logger.log(
        `Manual due reminder check skipped notifications for user ${userId}: notifications disabled by system config (NOTIFICATIONS_ENABLED=false).`,
      );
      return {
        success: true,
        message: 'Notifications are disabled by system config',
        detectedUpcomingCount: upcomingItems.length,
        dispatchedAlertsCount: 0,
        logs: [],
      };
    }

    const { detected, dispatched, logs } = await this.checkAndSendRemindersForUser(user);

    return {
      success: true,
      message: 'Due reminders processed successfully',
      detectedUpcomingCount: detected,
      dispatchedAlertsCount: dispatched,
      logs,
    };
  }

  async checkAndSendRemindersForUser(
    user: UserDocument,
  ): Promise<{ detected: number; dispatched: number; logs: NotificationLogDocument[] }> {
    const userId = user._id.toString();
    const upcomingItems = await this.detectUpcomingDues(userId);

    if (upcomingItems.length === 0) {
      return { detected: 0, dispatched: 0, logs: [] };
    }

    const isEnabled = await this.systemConfigService.isNotificationsEnabled();
    if (!isEnabled) {
      return { detected: upcomingItems.length, dispatched: 0, logs: [] };
    }

    // Filter out items already notified today
    const itemsToNotify: UpcomingItem[] = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const item of upcomingItems) {
      const alreadySent = await this.logModel
        .findOne({
          userId: user._id,
          targetType: item.targetType,
          targetId: item.targetId,
          sentAt: { $gte: todayStart },
          status: NotificationStatus.SENT,
        })
        .exec();

      if (!alreadySent) {
        itemsToNotify.push(item);
      }
    }

    if (itemsToNotify.length === 0) {
      return { detected: upcomingItems.length, dispatched: 0, logs: [] };
    }

    const createdLogs: NotificationLogDocument[] = [];

    // 1. Dispatch Web Push
    try {
      const pushTitle =
        itemsToNotify.length === 1
          ? `Recordatorio: ${itemsToNotify[0].title} por vencer`
          : `Tienes ${itemsToNotify.length} compromisos por vencer`;

      const pushBody = itemsToNotify
        .map((i) => `• ${i.title}: $${i.amount.toFixed(2)} (${i.dueDateStr})`)
        .slice(0, 3)
        .join('\n');

      const pushResult = await this.webPushService.sendPushToUser(userId, {
        title: pushTitle,
        body: pushBody,
      });

      if (pushResult.sent > 0) {
        for (const item of itemsToNotify) {
          const log = new this.logModel({
            userId: user._id,
            channel: NotificationChannel.WEB_PUSH,
            targetType: item.targetType,
            targetId: item.targetId,
            recipient: `${pushResult.sent} device(s)`,
            title: pushTitle,
            message: pushBody,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          });
          createdLogs.push(await log.save());
        }
      }
    } catch (pushErr: any) {
      this.logger.warn(`Web Push dispatch failed for user ${userId}: ${pushErr.message}`);
    }

    // 2. Dispatch Email
    if (user.email) {
      try {
        const duesForEmail: DueItem[] = itemsToNotify.map((i) => ({
          type: i.itemType,
          title: i.title,
          amount: i.amount,
          dueDate: i.dueDateStr,
          daysRemaining: i.daysRemaining,
        }));

        const emailResult = await this.emailService.sendDueReminderEmail(
          { email: user.email, name: user.name },
          duesForEmail,
        );

        if (emailResult.success) {
          for (const item of itemsToNotify) {
            const log = new this.logModel({
              userId: user._id,
              channel: NotificationChannel.EMAIL,
              targetType: item.targetType,
              targetId: item.targetId,
              recipient: user.email,
              title: `Recordatorio de Pagos Próximos (${itemsToNotify.length})`,
              message: `Reminder email dispatched with item: ${item.title}`,
              status: NotificationStatus.SENT,
              sentAt: new Date(),
            });
            createdLogs.push(await log.save());
          }
        }
      } catch (emailErr: any) {
        this.logger.warn(`Email dispatch failed for user ${userId}: ${emailErr.message}`);
      }
    }

    return {
      detected: upcomingItems.length,
      dispatched: itemsToNotify.length,
      logs: createdLogs,
    };
  }

  async detectUpcomingDues(userId: string): Promise<UpcomingItem[]> {
    const userObjectId = new Types.ObjectId(userId);
    const items: UpcomingItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in3DaysEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 3,
      23,
      59,
      59,
      999,
    );

    // 1. Credit Cards: Cards where paymentDueDay is within 0-3 days
    const cards = await this.cardModel
      .find({
        userId: userObjectId,
        type: AccountCardType.CREDIT,
        isActive: true,
      })
      .exec();

    for (const card of cards) {
      if (card.paymentDueDay) {
        // Calculate payment due date in current month or next month
        let dueYear = now.getFullYear();
        let dueMonth = now.getMonth();
        let dueDate = new Date(dueYear, dueMonth, card.paymentDueDay);

        // If due date in current month has already passed, evaluate next month
        if (dueDate.getTime() < todayStart.getTime()) {
          dueMonth++;
          if (dueMonth > 11) {
            dueMonth = 0;
            dueYear++;
          }
          dueDate = new Date(dueYear, dueMonth, card.paymentDueDay);
        }

        const diffTime = dueDate.getTime() - todayStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 3) {
          items.push({
            targetType: NotificationTargetType.CARD_PAYMENT_DUE,
            targetId: card._id.toString(),
            title: `Tarjeta ${card.name}`,
            amount: 0, // Card payment depends on current statement
            dueDateStr: dueDate.toISOString().split('T')[0],
            daysRemaining: diffDays,
            itemType: 'CARD',
          });
        }
      }
    }

    // 2. Unpaid Services & Subscriptions
    const expenses = await this.expenseModel
      .find({
        userId: userObjectId,
        isPaid: false,
        category: { $in: [ExpenseCategory.SERVICE, ExpenseCategory.SUBSCRIPTION] },
        paymentDueDate: { $gte: todayStart, $lte: in3DaysEnd },
      })
      .exec();

    for (const exp of expenses) {
      if (exp.paymentDueDate) {
        const diffTime = new Date(exp.paymentDueDate).getTime() - todayStart.getTime();
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        items.push({
          targetType: NotificationTargetType.SERVICE_DUE,
          targetId: exp._id.toString(),
          title: exp.title,
          amount: exp.amount,
          dueDateStr: new Date(exp.paymentDueDate).toISOString().split('T')[0],
          daysRemaining: diffDays,
          itemType: 'SERVICE',
        });
      }
    }

    // 3. Unreceived Debt Collections
    const incomes = await this.incomeModel
      .find({
        userId: userObjectId,
        source: IncomeSource.DEBT_COLLECTION,
        isReceived: false,
        dueDate: { $gte: todayStart, $lte: in3DaysEnd },
      })
      .exec();

    for (const inc of incomes) {
      if (inc.dueDate) {
        const diffTime = new Date(inc.dueDate).getTime() - todayStart.getTime();
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        items.push({
          targetType: NotificationTargetType.DEBT_COLLECTION_DUE,
          targetId: inc._id.toString(),
          title: inc.title,
          amount: inc.amount,
          dueDateStr: new Date(inc.dueDate).toISOString().split('T')[0],
          daysRemaining: diffDays,
          itemType: 'DEBT_COLLECTION',
        });
      }
    }

    return items;
  }
}
