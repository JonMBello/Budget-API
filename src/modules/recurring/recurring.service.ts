import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import {
  RecurringCategory,
  RecurringTemplate,
  RecurringTemplateDocument,
  SplitInfo,
  SplitType,
} from './schemas/recurring-template.schema';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { AdvanceMsiDto } from './dto/advance-msi.dto';
import { InstantiateResultDto, SplitResponseDto } from './dto/recurring-response.dto';
import { Currency } from '../users/schemas/user.schema';
import { Expense, ExpenseDocument, ExpenseCategory } from '../expenses/schemas/expense.schema';
import { Income, IncomeDocument, IncomeSource } from '../incomes/schemas/income.schema';
import {
  BudgetPeriod,
  BudgetPeriodDocument,
  BudgetPeriodStatus,
} from '../budgets/schemas/budget-period.schema';
import { Person, PersonDocument } from '../people/schemas/person.schema';
import { CardsService } from '../cards/cards.service';
import { BudgetsService } from '../budgets/budgets.service';
import {
  AccountCardType,
  calculateStatementCycle,
  formatDate,
  getDaysInMonth,
  parseDateComponents,
} from '../../common/utils/card-cycle.util';

function mapRecurringToExpenseCategory(category: RecurringCategory): ExpenseCategory {
  switch (category) {
    case RecurringCategory.SERVICE:
      return ExpenseCategory.SERVICE;
    case RecurringCategory.SUBSCRIPTION:
      return ExpenseCategory.SUBSCRIPTION;
    case RecurringCategory.MSI:
      return ExpenseCategory.MSI;
    case RecurringCategory.OTHER_RECURRING:
      return ExpenseCategory.OTHER;
    default:
      return ExpenseCategory.OTHER;
  }
}

@Injectable()
export class RecurringService {
  private readonly activeLocks = new Set<string>();

  constructor(
    @InjectModel(RecurringTemplate.name)
    private readonly recurringModel: Model<RecurringTemplateDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(BudgetPeriod.name)
    private readonly budgetPeriodModel: Model<BudgetPeriodDocument>,
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly cardsService: CardsService,
    private readonly budgetsService: BudgetsService,
  ) {}

  private async acquireLock(key: string): Promise<() => void> {
    while (this.activeLocks.has(key)) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.activeLocks.add(key);
    return () => {
      this.activeLocks.delete(key);
    };
  }

  async create(userId: string, dto: CreateRecurringDto): Promise<RecurringTemplateDocument> {
    const userObjectId = new Types.ObjectId(userId);

    let amount = dto.amount;
    let totalAmount = dto.totalAmount ?? null;
    let totalInstallments = dto.totalInstallments ?? null;
    let currentInstallment = dto.currentInstallment ?? null;

    if (dto.category === RecurringCategory.MSI) {
      if (!totalInstallments || totalInstallments < 2) {
        throw new BadRequestException('MSI plans require at least 2 installments');
      }

      if (!totalAmount && !amount) {
        throw new BadRequestException(
          'Either totalAmount or monthly amount is required for MSI plans',
        );
      }

      if (!totalAmount && amount) {
        totalAmount = Math.round(amount * totalInstallments * 100) / 100;
      } else if (totalAmount && !amount) {
        amount = Math.round((totalAmount / totalInstallments) * 100) / 100;
      }

      currentInstallment = currentInstallment ?? 1;
    } else {
      if (!amount) {
        throw new BadRequestException(
          'Monthly amount is required for recurring services and subscriptions',
        );
      }
      totalAmount = null;
      totalInstallments = null;
      currentInstallment = null;
    }

    let splitInfo: SplitInfo | null = null;
    if (dto.split) {
      const splitAmount =
        dto.split.splitType === SplitType.PERCENTAGE
          ? Math.round(amount! * (dto.split.splitValue / 100) * 100) / 100
          : dto.split.splitValue;

      splitInfo = {
        personId: new Types.ObjectId(dto.split.personId),
        splitType: dto.split.splitType,
        splitValue: dto.split.splitValue,
        splitAmount,
      };
    }

    const template = new this.recurringModel({
      userId: userObjectId,
      title: dto.title,
      category: dto.category,
      cardId: dto.cardId ? new Types.ObjectId(dto.cardId) : null,
      amount,
      currency: dto.currency,
      exchangeRate: dto.exchangeRate ?? 1.0,
      totalAmount,
      totalInstallments,
      currentInstallment,
      startDate: dto.startDate ?? null,
      split: splitInfo,
      isActive: true,
      isCompleted: false,
      notes: dto.notes ?? null,
    });

    return template.save();
  }

  async findAllByUser(
    userId: string,
    includeInactive = false,
    category?: RecurringCategory,
  ): Promise<RecurringTemplateDocument[]> {
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (category) {
      filter.category = category;
    }

    return this.recurringModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<RecurringTemplateDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Recurring template not found');
    }

    const template = await this.recurringModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!template) {
      throw new NotFoundException('Recurring template not found');
    }

    return template;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringDto,
  ): Promise<RecurringTemplateDocument> {
    const existing = await this.findOne(userId, id);

    const updateFields: Record<string, any> = {};

    if (dto.title !== undefined) updateFields.title = dto.title;
    if (dto.notes !== undefined) updateFields.notes = dto.notes;
    if (dto.cardId !== undefined) {
      updateFields.cardId = dto.cardId ? new Types.ObjectId(dto.cardId) : null;
    }
    if (dto.isActive !== undefined) updateFields.isActive = dto.isActive;
    if (dto.isCompleted !== undefined) updateFields.isCompleted = dto.isCompleted;
    if (dto.currency !== undefined) updateFields.currency = dto.currency;
    if (dto.exchangeRate !== undefined) updateFields.exchangeRate = dto.exchangeRate;

    const resultingCategory = dto.category ?? existing.category;
    updateFields.category = resultingCategory;

    let amount = dto.amount ?? existing.amount;
    const totalInstallments = dto.totalInstallments ?? existing.totalInstallments;
    let totalAmount = dto.totalAmount ?? existing.totalAmount;

    if (resultingCategory === RecurringCategory.MSI) {
      if (totalInstallments && totalInstallments < 2) {
        throw new BadRequestException('MSI plans require at least 2 installments');
      }

      if (dto.amount && !dto.totalAmount && totalInstallments) {
        totalAmount = Math.round(dto.amount * totalInstallments * 100) / 100;
      } else if (dto.totalAmount && !dto.amount && totalInstallments) {
        amount = Math.round((dto.totalAmount / totalInstallments) * 100) / 100;
      }

      updateFields.amount = amount;
      updateFields.totalAmount = totalAmount;
      updateFields.totalInstallments = totalInstallments;
      if (dto.currentInstallment !== undefined) {
        updateFields.currentInstallment = dto.currentInstallment;
      }
    } else {
      updateFields.amount = amount;
    }

    if (dto.split !== undefined) {
      if (dto.split === null) {
        updateFields.split = null;
      } else {
        const splitAmount =
          dto.split.splitType === SplitType.PERCENTAGE
            ? Math.round(amount * (dto.split.splitValue / 100) * 100) / 100
            : dto.split.splitValue;

        updateFields.split = {
          personId: new Types.ObjectId(dto.split.personId),
          splitType: dto.split.splitType,
          splitValue: dto.split.splitValue,
          splitAmount,
        };
      }
    }

    const updated = await this.recurringModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true })
      .exec();

    return updated!;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(userId, id);

    await this.recurringModel.findByIdAndUpdate(id, { $set: { isActive: false } }).exec();

    return {
      success: true,
      message: 'Recurring template deactivated successfully',
    };
  }

  async advanceMsi(
    userId: string,
    id: string,
    dto: AdvanceMsiDto,
  ): Promise<RecurringTemplateDocument> {
    const template = await this.findOne(userId, id);

    if (template.category !== RecurringCategory.MSI) {
      throw new BadRequestException('Only MSI plans can be advanced or liquidated');
    }

    if (template.isCompleted) {
      throw new BadRequestException('This MSI plan is already completed');
    }

    const total = template.totalInstallments || 2;
    if (dto.payAll) {
      template.currentInstallment = total;
      template.isCompleted = true;
      template.isActive = false;
    } else {
      const advance = dto.installmentsCount ?? 1;
      const next = (template.currentInstallment || 1) + advance;
      if (next >= total) {
        template.currentInstallment = total;
        template.isCompleted = true;
        template.isActive = false;
      } else {
        template.currentInstallment = next;
      }
    }

    return template.save();
  }

  async cancel(userId: string, id: string): Promise<RecurringTemplateDocument> {
    const template = await this.findOne(userId, id);
    template.isActive = false;
    return template.save();
  }

  async instantiateForPeriod(userId: string, periodId: string): Promise<InstantiateResultDto> {
    if (!Types.ObjectId.isValid(periodId)) {
      throw new BadRequestException('Invalid periodId format');
    }

    const userObjectId = new Types.ObjectId(userId);
    const periodObjectId = new Types.ObjectId(periodId);

    const period = await this.budgetPeriodModel
      .findOne({
        _id: periodObjectId,
        userId: userObjectId,
      })
      .exec();

    if (!period) {
      throw new NotFoundException('Budget period not found');
    }

    if (period.status === BudgetPeriodStatus.CLOSED) {
      throw new ConflictException(
        'Cannot instantiate recurring charges into a closed budget period',
      );
    }

    const releaseLock = await this.acquireLock(`${userId}:${periodId}`);
    try {
      return await this.processPeriodInstantiation(userObjectId, period);
    } finally {
      releaseLock();
    }
  }

  private async processPeriodInstantiation(
    userObjectId: Types.ObjectId,
    period: BudgetPeriodDocument,
  ): Promise<InstantiateResultDto> {
    const userId = userObjectId.toString();
    const periodId = period._id.toString();

    // 1. Fetch active templates belonging to the user
    const templates = await this.recurringModel
      .find({
        userId: userObjectId,
        isActive: true,
      })
      .exec();

    // 2. Fetch existing expenses in this period that were generated from a template
    const existingExpenses = await this.expenseModel
      .find({
        periodId: period._id,
        templateId: { $ne: null },
      })
      .exec();

    const existingTemplateIds = new Set(existingExpenses.map((e) => e.templateId!.toString()));

    let skippedCount = 0;
    const eligibleTemplates: RecurringTemplateDocument[] = [];

    for (const template of templates) {
      const tId = template._id.toString();

      // Rule 4: If expense already exists for this template in this period -> skippedCount
      if (existingTemplateIds.has(tId)) {
        skippedCount++;
        continue;
      }

      // Rule 2: Start date check
      if (template.startDate) {
        const { year: sYear, month: sMonth } = parseDateComponents(template.startDate);
        if (period.year < sYear || (period.year === sYear && period.month < sMonth)) {
          // Template has not started yet for the requested period -> not eligible
          continue;
        }
      }

      // Rule 2 & 4: MSI specific checks
      if (template.category === RecurringCategory.MSI) {
        if (
          template.isCompleted ||
          (template.currentInstallment &&
            template.totalInstallments &&
            template.currentInstallment > template.totalInstallments)
        ) {
          // Completed MSI plans are not eligible
          continue;
        }

        // Avoid assigning cuotas out of order / after deletion
        if (template.lastInstantiatedYear != null && template.lastInstantiatedMonth != null) {
          if (
            period.year < template.lastInstantiatedYear ||
            (period.year === template.lastInstantiatedYear &&
              period.month <= template.lastInstantiatedMonth)
          ) {
            // Period is prior to or equal to last generated installment -> not eligible
            continue;
          }
        } else {
          // Fallback: Check if there is already an expense generated in a future period
          const laterExpense = await this.expenseModel
            .findOne({
              templateId: template._id,
              date: {
                $gt: formatDate(
                  period.year,
                  period.month,
                  getDaysInMonth(period.year, period.month),
                ),
              },
            })
            .exec();

          if (laterExpense) {
            continue;
          }
        }
      }

      eligibleTemplates.push(template);
    }

    if (eligibleTemplates.length === 0) {
      return {
        periodId,
        year: period.year,
        month: period.month,
        createdCount: 0,
        skippedCount,
      };
    }

    // 3. Atomically create real expenses and update MSI templates
    const createdCount = await this.executeAtomicInstantiation(userId, period, eligibleTemplates);

    // 4. Recalculate and synchronize budget totals for the period
    await this.syncPeriodTotals(userId, periodId);

    return {
      periodId,
      year: period.year,
      month: period.month,
      createdCount,
      skippedCount,
    };
  }

  private async executeAtomicInstantiation(
    userId: string,
    period: BudgetPeriodDocument,
    templates: RecurringTemplateDocument[],
  ): Promise<number> {
    let session: ClientSession | null = null;
    let supportsTransactions = false;

    try {
      session = await this.connection.startSession();
      session.startTransaction();
      supportsTransactions = true;
    } catch {
      supportsTransactions = false;
      if (session) {
        await session.endSession().catch(() => {});
        session = null;
      }
    }

    const createdExpenseIds: Types.ObjectId[] = [];
    const createdIncomeIds: Types.ObjectId[] = [];
    const templateSnapshots = new Map<
      string,
      {
        currentInstallment: number | null | undefined;
        isCompleted: boolean;
        isActive: boolean;
        lastInstantiatedYear: number | null | undefined;
        lastInstantiatedMonth: number | null | undefined;
      }
    >();

    const rollbackCompensation = async () => {
      if (createdExpenseIds.length > 0) {
        await this.expenseModel.deleteMany({ _id: { $in: createdExpenseIds } }).catch(() => {});
      }
      if (createdIncomeIds.length > 0) {
        await this.incomeModel.deleteMany({ _id: { $in: createdIncomeIds } }).catch(() => {});
      }
      for (const [tId, snap] of templateSnapshots.entries()) {
        await this.recurringModel
          .findByIdAndUpdate(tId, {
            $set: {
              currentInstallment: snap.currentInstallment,
              isCompleted: snap.isCompleted,
              isActive: snap.isActive,
              lastInstantiatedYear: snap.lastInstantiatedYear,
              lastInstantiatedMonth: snap.lastInstantiatedMonth,
            },
          })
          .catch(() => {});
      }
    };

    const performWork = async (activeSession?: ClientSession): Promise<number> => {
      let created = 0;

      for (const template of templates) {
        const tId = template._id.toString();
        templateSnapshots.set(tId, {
          currentInstallment: template.currentInstallment,
          isCompleted: template.isCompleted,
          isActive: template.isActive,
          lastInstantiatedYear: template.lastInstantiatedYear,
          lastInstantiatedMonth: template.lastInstantiatedMonth,
        });

        let title = template.title;
        let isFinalInstallment = false;
        let current = template.currentInstallment ?? 1;
        let total = template.totalInstallments ?? current;

        if (template.category === RecurringCategory.MSI) {
          current = template.currentInstallment || 1;
          total = template.totalInstallments || current;
          isFinalInstallment = current >= total;
          title = `${template.title} (Cuota ${current}/${total})`;
        }

        // Amount calculation with cent adjustment on final MSI installment
        let rawAmount = template.amount;
        if (
          template.category === RecurringCategory.MSI &&
          isFinalInstallment &&
          template.totalAmount
        ) {
          rawAmount =
            Math.round((template.totalAmount - template.amount * (total - 1)) * 100) / 100;
        }

        // Currency conversion
        let finalAmount = rawAmount;
        if (
          template.currency &&
          template.currency !== Currency.MXN &&
          template.exchangeRate &&
          template.exchangeRate > 0
        ) {
          finalAmount = Math.round(rawAmount * template.exchangeRate * 100) / 100;
        }

        // Date calculation (adjusted to last day of month if non-existent)
        const preferredDay = template.startDate ? parseDateComponents(template.startDate).day : 1;
        const daysInMonth = getDaysInMonth(period.year, period.month);
        const adjustedDay = Math.min(preferredDay, daysInMonth);
        const expenseDate = formatDate(period.year, period.month, adjustedDay);

        // Payment due date via card cycle
        let paymentDueDate: string | null = null;
        if (template.cardId) {
          try {
            const card = await this.cardsService.findOne(userId, template.cardId.toString());
            if (card.type === AccountCardType.CREDIT && card.cutoffDay && card.paymentDueDay) {
              const cycle = calculateStatementCycle({
                purchaseDate: expenseDate,
                cutoffDay: card.cutoffDay,
                paymentDueDay: card.paymentDueDay,
                type: card.type,
              });
              paymentDueDate = cycle.paymentDueDate;
            }
          } catch {
            // retain default null
          }
        }

        // Build Expense document
        const expenseDoc = new this.expenseModel({
          userId: period.userId,
          periodId: period._id,
          templateId: template._id,
          cardId: template.cardId ?? null,
          title,
          amount: finalAmount,
          category: mapRecurringToExpenseCategory(template.category),
          date: expenseDate,
          paymentDueDate,
          isPaid: false,
          notes: template.notes ?? null,
        });

        // Split & Debt Collection Income
        if (template.split) {
          let debtorName = 'Debtor';
          try {
            const personQuery = this.personModel.findOne({
              _id: template.split.personId,
              userId: period.userId,
            });
            if (activeSession) personQuery.session(activeSession);
            const person = await personQuery.exec();
            if (person) debtorName = person.name;
          } catch {
            // ignore
          }

          const splitAmount =
            template.split.splitType === SplitType.PERCENTAGE
              ? Math.round(finalAmount * (template.split.splitValue / 100) * 100) / 100
              : template.split.splitValue;

          const linkedIncome = new this.incomeModel({
            userId: period.userId,
            periodId: period._id,
            title: `Cobro a ${debtorName}: ${title}`,
            amount: splitAmount,
            date: expenseDate,
            source: IncomeSource.DEBT_COLLECTION,
            isReceived: false,
            dueDate: paymentDueDate || expenseDate,
            debtorPersonId: template.split.personId,
            notes: `Projected split debt collection from recurring expense: ${title}`,
            linkedExpenseId: expenseDoc._id,
          });

          await linkedIncome.save(activeSession ? { session: activeSession } : undefined);
          createdIncomeIds.push(linkedIncome._id);

          expenseDoc.split = {
            personId: template.split.personId,
            splitType: template.split.splitType,
            splitValue: template.split.splitValue,
            splitAmount,
            isDebtActive: true,
            linkedIncomeId: linkedIncome._id,
          };
        }

        // Save Expense
        try {
          await expenseDoc.save(activeSession ? { session: activeSession } : undefined);
          createdExpenseIds.push(expenseDoc._id);
        } catch (err: any) {
          if (err?.code === 11000) {
            continue;
          }
          throw err;
        }

        // Advance MSI only after creating the expense
        if (template.category === RecurringCategory.MSI) {
          template.lastInstantiatedYear = period.year;
          template.lastInstantiatedMonth = period.month;

          if (isFinalInstallment) {
            template.isCompleted = true;
            template.isActive = false;
          } else {
            template.currentInstallment = current + 1;
          }

          await template.save(activeSession ? { session: activeSession } : undefined);
        }

        created++;
      }

      return created;
    };

    if (supportsTransactions && session) {
      try {
        const result = await performWork(session);
        await session.commitTransaction();
        return result;
      } catch (err: any) {
        await session.abortTransaction().catch(() => {});
        if (
          err?.message?.includes(
            'Transaction numbers are only allowed on a replica set member or mongos',
          ) ||
          err?.code === 20
        ) {
          await session.endSession().catch(() => {});
          session = null;
          try {
            return await performWork(undefined);
          } catch (fallbackErr) {
            await rollbackCompensation();
            throw fallbackErr;
          }
        }
        throw err;
      } finally {
        if (session) {
          await session.endSession().catch(() => {});
        }
      }
    } else {
      try {
        return await performWork(undefined);
      } catch (err) {
        await rollbackCompensation();
        throw err;
      }
    }
  }

  private async syncPeriodTotals(userId: string, periodId: string): Promise<void> {
    try {
      const expenses = await this.expenseModel
        .find({
          userId: new Types.ObjectId(userId),
          periodId: new Types.ObjectId(periodId),
        })
        .exec();
      const totalExpenses = Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;

      const incomes = await this.incomeModel
        .find({
          userId: new Types.ObjectId(userId),
          periodId: new Types.ObjectId(periodId),
        })
        .exec();
      const totalIncome = Math.round(incomes.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;

      await this.budgetsService.syncTotals(userId, periodId, totalIncome, totalExpenses);
    } catch {
      // ignore
    }
  }

  async findActiveDebtsByPerson(
    userId: string,
    personId: string,
  ): Promise<RecurringTemplateDocument[]> {
    return this.recurringModel
      .find({
        userId: new Types.ObjectId(userId),
        isActive: true,
        'split.personId': new Types.ObjectId(personId),
      })
      .exec();
  }

  private toSplitResponse(split?: SplitInfo | null): SplitResponseDto | null {
    if (!split) return null;
    return {
      personId: split.personId.toString(),
      splitType: split.splitType,
      splitValue: split.splitValue,
      splitAmount: split.splitAmount,
    };
  }
}
