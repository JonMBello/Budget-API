import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument, ExpenseCategory } from './schemas/expense.schema';
import { Person, PersonDocument } from '../people/schemas/person.schema';
import { CardsService } from '../cards/cards.service';
import { IncomesService } from '../incomes/incomes.service';
import { BudgetsService } from '../budgets/budgets.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { SplitType } from '../recurring/schemas/recurring-template.schema';
import { IncomeSource } from '../incomes/schemas/income.schema';
import { AccountCardType } from '../../common/utils/card-cycle.util';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
    private readonly cardsService: CardsService,
    private readonly incomesService: IncomesService,
    private readonly budgetsService: BudgetsService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<ExpenseDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const periodObjectId = new Types.ObjectId(dto.periodId);

    let paymentDueDate = dto.paymentDueDate ?? null;

    if (dto.cardId) {
      try {
        const card = await this.cardsService.findOne(userId, dto.cardId);
        if (card.type === AccountCardType.CREDIT && card.cutoffDay && card.paymentDueDay) {
          const cycle = await this.cardsService.previewStatement(userId, dto.cardId, dto.date);
          paymentDueDate = cycle.paymentDueDate;
        }
      } catch {
        // card may not exist or preview failed, retain default
      }
    }

    let splitInfo: any = null;
    let splitAmount = 0;

    if (dto.split) {
      splitAmount =
        dto.split.splitType === SplitType.PERCENTAGE
          ? Math.round(dto.amount * (dto.split.splitValue / 100) * 100) / 100
          : dto.split.splitValue;

      splitInfo = {
        personId: new Types.ObjectId(dto.split.personId),
        splitType: dto.split.splitType,
        splitValue: dto.split.splitValue,
        splitAmount,
        isDebtActive: dto.split.isDebtActive ?? true,
        linkedIncomeId: null,
      };
    }

    const expense = new this.expenseModel({
      userId: userObjectId,
      periodId: periodObjectId,
      templateId: dto.templateId ? new Types.ObjectId(dto.templateId) : null,
      cardId: dto.cardId ? new Types.ObjectId(dto.cardId) : null,
      title: dto.title,
      amount: dto.amount,
      category: dto.category,
      date: dto.date,
      paymentDueDate,
      isPaid: dto.isPaid ?? false,
      split: splitInfo,
      notes: dto.notes ?? null,
    });

    const savedExpense = await expense.save();

    // If split is configured, automatically generate the projected income
    if (dto.split) {
      let debtorName = 'Debtor';
      try {
        const person = await this.personModel
          .findOne({
            _id: new Types.ObjectId(dto.split.personId),
            userId: userObjectId,
          })
          .exec();
        if (person) {
          debtorName = person.name;
        }
      } catch {
        // ignore
      }

      const linkedIncome = await this.incomesService.create(userId, {
        periodId: dto.periodId,
        title: `Cobro a ${debtorName}: ${dto.title}`,
        amount: splitAmount,
        date: dto.date,
        source: IncomeSource.DEBT_COLLECTION,
        isReceived: false,
        dueDate: paymentDueDate || dto.date,
        debtorPersonId: dto.split.personId,
        notes: `Projected split debt collection from expense: ${dto.title}`,
      });

      savedExpense.split!.linkedIncomeId = linkedIncome._id as any;
      await savedExpense.save();

      // update income back reference
      await this.incomesService.update(userId, linkedIncome._id.toString(), {
        linkedExpenseId: savedExpense._id.toString(),
      } as any);
    }

    await this.syncBudgetTotals(userId, dto.periodId);

    return savedExpense;
  }

  async findAllByPeriod(
    userId: string,
    periodId?: string,
    category?: ExpenseCategory,
  ): Promise<ExpenseDocument[]> {
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (periodId) {
      filter.periodId = new Types.ObjectId(periodId);
    }

    if (category) {
      filter.category = category;
    }

    return this.expenseModel.find(filter).sort({ date: -1, createdAt: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<ExpenseDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const expense = await this.expenseModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseDocument> {
    const existing = await this.findOne(userId, id);

    const updateFields: Record<string, any> = {};
    if (dto.title !== undefined) updateFields.title = dto.title;
    if (dto.amount !== undefined) updateFields.amount = dto.amount;
    if (dto.category !== undefined) updateFields.category = dto.category;
    if (dto.date !== undefined) updateFields.date = dto.date;
    if (dto.isPaid !== undefined) updateFields.isPaid = dto.isPaid;
    if (dto.notes !== undefined) updateFields.notes = dto.notes;
    if (dto.periodId !== undefined) updateFields.periodId = new Types.ObjectId(dto.periodId);
    if (dto.templateId !== undefined) {
      updateFields.templateId = dto.templateId ? new Types.ObjectId(dto.templateId) : null;
    }
    if (dto.cardId !== undefined) {
      updateFields.cardId = dto.cardId ? new Types.ObjectId(dto.cardId) : null;
    }

    const targetAmount = dto.amount ?? existing.amount;
    const targetDate = dto.date ?? existing.date;
    const targetCardId = dto.cardId !== undefined ? dto.cardId : existing.cardId?.toString();

    if (dto.paymentDueDate !== undefined) {
      updateFields.paymentDueDate = dto.paymentDueDate;
    } else if (targetCardId && (dto.cardId !== undefined || dto.date !== undefined)) {
      try {
        const card = await this.cardsService.findOne(userId, targetCardId);
        if (card.type === AccountCardType.CREDIT && card.cutoffDay && card.paymentDueDay) {
          const cycle = await this.cardsService.previewStatement(userId, targetCardId, targetDate);
          updateFields.paymentDueDate = cycle.paymentDueDate;
        }
      } catch {
        // ignore
      }
    }

    // Handle split sync
    if (dto.split !== undefined) {
      if (dto.split === null) {
        if (existing.split?.linkedIncomeId) {
          try {
            await this.incomesService.remove(userId, existing.split.linkedIncomeId.toString());
          } catch {
            // ignore
          }
        }
        updateFields.split = null;
      } else {
        const splitAmount =
          dto.split.splitType === SplitType.PERCENTAGE
            ? Math.round(targetAmount * (dto.split.splitValue / 100) * 100) / 100
            : dto.split.splitValue;

        if (existing.split?.linkedIncomeId) {
          await this.incomesService.update(userId, existing.split.linkedIncomeId.toString(), {
            amount: splitAmount,
            debtorPersonId: dto.split.personId,
            date: targetDate,
          });

          updateFields.split = {
            personId: new Types.ObjectId(dto.split.personId),
            splitType: dto.split.splitType,
            splitValue: dto.split.splitValue,
            splitAmount,
            isDebtActive: dto.split.isDebtActive ?? existing.split.isDebtActive,
            linkedIncomeId: existing.split.linkedIncomeId,
          };
        } else {
          let debtorName = 'Debtor';
          try {
            const person = await this.personModel
              .findOne({
                _id: new Types.ObjectId(dto.split.personId),
                userId: new Types.ObjectId(userId),
              })
              .exec();
            if (person) debtorName = person.name;
          } catch {
            // ignore
          }

          const linkedIncome = await this.incomesService.create(userId, {
            periodId: (dto.periodId ?? existing.periodId).toString(),
            title: `Cobro a ${debtorName}: ${dto.title ?? existing.title}`,
            amount: splitAmount,
            date: targetDate,
            source: IncomeSource.DEBT_COLLECTION,
            isReceived: false,
            dueDate: updateFields.paymentDueDate || existing.paymentDueDate || targetDate,
            debtorPersonId: dto.split.personId,
          });

          updateFields.split = {
            personId: new Types.ObjectId(dto.split.personId),
            splitType: dto.split.splitType,
            splitValue: dto.split.splitValue,
            splitAmount,
            isDebtActive: dto.split.isDebtActive ?? true,
            linkedIncomeId: linkedIncome._id,
          };
        }
      }
    } else if (dto.amount !== undefined && existing.split) {
      const splitAmount =
        existing.split.splitType === SplitType.PERCENTAGE
          ? Math.round(dto.amount * (existing.split.splitValue / 100) * 100) / 100
          : existing.split.splitValue;

      updateFields['split.splitAmount'] = splitAmount;

      if (existing.split.linkedIncomeId) {
        await this.incomesService.update(userId, existing.split.linkedIncomeId.toString(), {
          amount: splitAmount,
        });
      }
    }

    const updated = await this.expenseModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true })
      .exec();

    const targetPeriodId = (dto.periodId ?? existing.periodId).toString();
    await this.syncBudgetTotals(userId, targetPeriodId);

    return updated!;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.findOne(userId, id);

    if (existing.split?.linkedIncomeId) {
      try {
        const income = await this.incomesService.findOne(
          userId,
          existing.split.linkedIncomeId.toString(),
        );
        if (!income.isReceived) {
          await this.incomesService.remove(userId, existing.split.linkedIncomeId.toString());
        }
      } catch {
        // ignore if not found
      }
    }

    await this.expenseModel.findByIdAndDelete(id).exec();

    await this.syncBudgetTotals(userId, existing.periodId.toString());

    return {
      success: true,
      message: 'Expense deleted successfully',
    };
  }

  async findPendingDebtsByPerson(userId: string, personId: string): Promise<ExpenseDocument[]> {
    return this.expenseModel
      .find({
        userId: new Types.ObjectId(userId),
        'split.personId': new Types.ObjectId(personId),
        'split.isDebtActive': true,
      })
      .populate('cardId')
      .exec();
  }

  async markSplitAsPaid(userId: string, expenseId: string): Promise<ExpenseDocument> {
    const expense = await this.findOne(userId, expenseId);

    if (expense.split) {
      expense.split.isDebtActive = false;
      expense.markModified('split');
      if (expense.split.linkedIncomeId) {
        try {
          await this.incomesService.markAsReceived(
            userId,
            expense.split.linkedIncomeId.toString(),
            true,
          );
        } catch {
          // ignore
        }
      }
      await expense.save();
    }

    return expense;
  }

  async calculateTotalExpensesByPeriod(userId: string, periodId: string): Promise<number> {
    const expenses = await this.expenseModel
      .find({
        userId: new Types.ObjectId(userId),
        periodId: new Types.ObjectId(periodId),
      })
      .exec();

    const sum = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    return Math.round(sum * 100) / 100;
  }

  private async syncBudgetTotals(userId: string, periodId: string): Promise<void> {
    try {
      const totalExpenses = await this.calculateTotalExpensesByPeriod(userId, periodId);
      const totalIncome = await this.incomesService.calculateTotalIncomeByPeriod(userId, periodId);
      await this.budgetsService.syncTotals(userId, periodId, totalIncome, totalExpenses);
    } catch {
      // ignore if period doesn't exist
    }
  }
}
