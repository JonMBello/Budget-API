import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BudgetPeriod, BudgetPeriodDocument } from '../schemas/budget-period.schema';
import { Expense, ExpenseDocument, ExpenseCategory } from '../../expenses/schemas/expense.schema';
import { Income, IncomeDocument, IncomeSource } from '../../incomes/schemas/income.schema';
import { Person, PersonDocument } from '../../people/schemas/person.schema';
import { BudgetSummaryResponseDto } from '../dto/budget-summary.dto';

@Injectable()
export class BudgetMetricsService {
  constructor(
    @InjectModel(BudgetPeriod.name)
    private readonly budgetPeriodModel: Model<BudgetPeriodDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
  ) {}

  async getCurrentSummary(userId: string): Promise<BudgetSummaryResponseDto> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let period = await this.budgetPeriodModel
      .findOne({
        userId: new Types.ObjectId(userId),
        year: currentYear,
        month: currentMonth,
      })
      .exec();

    if (!period) {
      period = await this.budgetPeriodModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .sort({ year: -1, month: -1 })
        .exec();
    }

    if (!period) {
      throw new NotFoundException('No budget periods found for user');
    }

    return this.getSummaryForPeriod(userId, period);
  }

  async getSummaryByYearAndMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetSummaryResponseDto> {
    const period = await this.budgetPeriodModel
      .findOne({
        userId: new Types.ObjectId(userId),
        year,
        month,
      })
      .exec();

    if (!period) {
      throw new NotFoundException(`Budget period ${year}-${month} not found`);
    }

    return this.getSummaryForPeriod(userId, period);
  }

  async getSummaryForPeriod(
    userId: string,
    period: BudgetPeriodDocument,
  ): Promise<BudgetSummaryResponseDto> {
    const userObjectId = new Types.ObjectId(userId);
    const periodObjectId = period._id as Types.ObjectId;

    // 1. Group expenses by category and sum paid vs unpaid
    const expenseStats = await this.expenseModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          periodId: periodObjectId,
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$isPaid', true] }, '$amount', 0],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // 2. Group incomes by source and sum received vs unreceived
    const incomeStats = await this.incomeModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          periodId: periodObjectId,
        },
      },
      {
        $group: {
          _id: '$source',
          totalAmount: { $sum: '$amount' },
          totalReceived: {
            $sum: {
              $cond: [{ $eq: ['$isReceived', true] }, '$amount', 0],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // 3. Aggregate pending split debt collections and join with people collection
    const pendingDebtsAgg = await this.incomeModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          periodId: periodObjectId,
          source: IncomeSource.DEBT_COLLECTION,
          isReceived: false,
        },
      },
      {
        $group: {
          _id: '$debtorPersonId',
          amount: { $sum: '$amount' },
          pendingCount: { $sum: 1 },
          earliestDueDate: { $min: '$dueDate' },
        },
      },
      {
        $lookup: {
          from: 'people',
          localField: '_id',
          foreignField: '_id',
          as: 'personInfo',
        },
      },
      {
        $unwind: {
          path: '$personInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    // Process expenses breakdown
    const expensesByCategory: Record<string, number> = {};
    for (const cat of Object.values(ExpenseCategory)) {
      expensesByCategory[cat] = 0;
    }

    let totalExpenses = 0;
    let totalPaidExpenses = 0;

    for (const stat of expenseStats) {
      const cat = stat._id as string;
      const amount = Math.round((stat.totalAmount || 0) * 100) / 100;
      const paid = Math.round((stat.totalPaid || 0) * 100) / 100;

      expensesByCategory[cat] = amount;
      totalExpenses += amount;
      totalPaidExpenses += paid;
    }

    // Process incomes breakdown
    const incomesBySource: Record<string, number> = {};
    for (const src of Object.values(IncomeSource)) {
      incomesBySource[src] = 0;
    }

    let totalIncome = 0;
    let totalReceivedIncome = 0;

    for (const stat of incomeStats) {
      const src = stat._id as string;
      const amount = Math.round((stat.totalAmount || 0) * 100) / 100;
      const received = Math.round((stat.totalReceived || 0) * 100) / 100;

      incomesBySource[src] = amount;
      totalIncome += amount;
      totalReceivedIncome += received;
    }

    totalExpenses = Math.round(totalExpenses * 100) / 100;
    totalPaidExpenses = Math.round(totalPaidExpenses * 100) / 100;
    totalIncome = Math.round(totalIncome * 100) / 100;
    totalReceivedIncome = Math.round(totalReceivedIncome * 100) / 100;

    // Balances
    const carriedSavings = period.carriedSavings ?? 0;
    const netBalance = Math.round((carriedSavings + totalIncome - totalExpenses) * 100) / 100;
    const cashInPocketBalance =
      Math.round((carriedSavings + totalReceivedIncome - totalPaidExpenses) * 100) / 100;

    // Discretionary Payroll Surplus (HU-08.2)
    const services = expensesByCategory[ExpenseCategory.SERVICE] || 0;
    const subscriptions = expensesByCategory[ExpenseCategory.SUBSCRIPTION] || 0;
    const msi = expensesByCategory[ExpenseCategory.MSI] || 0;
    const fixedCommitments = Math.round((services + subscriptions + msi) * 100) / 100;

    const totalPayrollIncome = incomesBySource[IncomeSource.PAYROLL] || 0;
    const initialDiscretionaryPayrollSurplus =
      Math.round((totalPayrollIncome - fixedCommitments) * 100) / 100;

    const regularExpenses = expensesByCategory[ExpenseCategory.REGULAR_EXPENSE] || 0;
    const remainingDiscretionaryPayrollSurplus =
      Math.round((initialDiscretionaryPayrollSurplus - regularExpenses) * 100) / 100;

    // Receivables and Pending Debtors (HU-08.3)
    let pendingDebtCollections = 0;
    const debtors = pendingDebtsAgg.map((item) => {
      const amount = Math.round((item.amount || 0) * 100) / 100;
      pendingDebtCollections += amount;

      const earliestDueDate = item.earliestDueDate
        ? new Date(item.earliestDueDate).toISOString().split('T')[0]
        : null;

      return {
        personId: item._id ? item._id.toString() : null,
        name: item.personInfo?.name ?? 'Deudor sin registrar',
        amount,
        earliestDueDate,
        pendingCount: item.pendingCount ?? 1,
      };
    });

    pendingDebtCollections = Math.round(pendingDebtCollections * 100) / 100;

    return {
      periodId: period._id.toString(),
      year: period.year,
      month: period.month,
      status: period.status,
      carriedSavings,
      totalIncome,
      totalReceivedIncome,
      totalExpenses,
      totalPaidExpenses,
      netBalance,
      cashInPocketBalance,
      payrollSurplus: {
        totalPayrollIncome,
        fixedCommitments,
        services,
        subscriptions,
        msi,
        initialDiscretionaryPayrollSurplus,
        regularExpenses,
        remainingDiscretionaryPayrollSurplus,
      },
      receivables: {
        pendingDebtCollections,
        debtors,
      },
      expensesByCategory,
      incomesBySource,
    };
  }
}
