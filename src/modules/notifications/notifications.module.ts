import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WebPushSubscription,
  WebPushSubscriptionSchema,
} from './schemas/web-push-subscription.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AccountCard, AccountCardSchema } from '../cards/schemas/account-card.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Income, IncomeSchema } from '../incomes/schemas/income.schema';
import { WebPushService } from './services/web-push.service';
import { EmailService } from './services/email.service';
import { DueReminderScheduler } from './services/due-reminder-scheduler.service';
import { NotificationsController } from './notifications.controller';
import { UsersModule } from '../users/users.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebPushSubscription.name, schema: WebPushSubscriptionSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: User.name, schema: UserSchema },
      { name: AccountCard.name, schema: AccountCardSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Income.name, schema: IncomeSchema },
    ]),
    UsersModule,
    SystemConfigModule,
  ],
  controllers: [NotificationsController],
  providers: [WebPushService, EmailService, DueReminderScheduler],
  exports: [WebPushService, EmailService, DueReminderScheduler],
})
export class NotificationsModule {}
