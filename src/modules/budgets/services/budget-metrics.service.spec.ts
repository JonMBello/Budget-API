import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BudgetMetricsService } from './budget-metrics.service';
import { BudgetPeriod, BudgetPeriodStatus } from '../schemas/budget-period.schema';
import { Expense, ExpenseCategory } from '../../expenses/schemas/expense.schema';
import { Income, IncomeSource } from '../../incomes/schemas/income.schema';
import { Person } from '../../people/schemas/person.schema';

describe('BudgetMetricsService', () => {
  let service: BudgetMetricsService;
  let mockBudgetPeriodModel: any;
  let mockExpenseModel: any;
  let mockIncomeModel: any;
  let mockPersonModel: any;

  const mockUserId = '654321654321654321654321';
  const mockPeriodId = '654321654321654321654322';
  const mockPersonId = '654321654321654321654323';

  const mockPeriodDoc: any = {
    _id: new Types.ObjectId(mockPeriodId),
    userId: new Types.ObjectId(mockUserId),
    year: 2026,
    month: 9,
    status: BudgetPeriodStatus.OPEN,
    carriedSavings: 5000,
    totalIncome: 25000,
    totalExpenses: 9100,
  };

  beforeEach(async () => {
    mockBudgetPeriodModel = {
      findOne: jest.fn(),
    };

    mockExpenseModel = {
      aggregate: jest.fn(),
    };

    mockIncomeModel = {
      aggregate: jest.fn(),
    };

    mockPersonModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetMetricsService,
        {
          provide: getModelToken(BudgetPeriod.name),
          useValue: mockBudgetPeriodModel,
        },
        {
          provide: getModelToken(Expense.name),
          useValue: mockExpenseModel,
        },
        {
          provide: getModelToken(Income.name),
          useValue: mockIncomeModel,
        },
        {
          provide: getModelToken(Person.name),
          useValue: mockPersonModel,
        },
      ],
    }).compile();

    service = module.get<BudgetMetricsService>(BudgetMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Financial Calculations and Payroll Surplus (TICKET-08.4)', () => {
    it('should correctly compute fixed commitments, payroll surplus, and remaining surplus', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      // Expenses stats matching TICKET-08.4:
      // Services: $1500 (all paid)
      // Subscriptions: $600 (all paid)
      // MSI: $4000 (all paid)
      // Regular expenses: $3000 (all paid)
      mockExpenseModel.aggregate.mockResolvedValue([
        { _id: ExpenseCategory.SERVICE, totalAmount: 1500, totalPaid: 1500, count: 3 },
        { _id: ExpenseCategory.SUBSCRIPTION, totalAmount: 600, totalPaid: 600, count: 3 },
        { _id: ExpenseCategory.MSI, totalAmount: 4000, totalPaid: 4000, count: 2 },
        { _id: ExpenseCategory.REGULAR_EXPENSE, totalAmount: 3000, totalPaid: 3000, count: 5 },
      ]);

      // Income stats:
      // Payroll: $25000 (received)
      mockIncomeModel.aggregate
        .mockResolvedValueOnce([
          { _id: IncomeSource.PAYROLL, totalAmount: 25000, totalReceived: 25000, count: 1 },
        ])
        .mockResolvedValueOnce([]); // No pending debts

      const result = await service.getSummaryByYearAndMonth(mockUserId, 2026, 9);

      // Verify general balances
      expect(result.carriedSavings).toBe(5000);
      expect(result.totalIncome).toBe(25000);
      expect(result.totalReceivedIncome).toBe(25000);
      expect(result.totalExpenses).toBe(9100);
      expect(result.totalPaidExpenses).toBe(9100);
      expect(result.netBalance).toBe(20900); // (5000 + 25000) - 9100
      expect(result.cashInPocketBalance).toBe(20900);

      // Verify TICKET-08.4 calculations
      expect(result.payrollSurplus.totalPayrollIncome).toBe(25000);
      expect(result.payrollSurplus.services).toBe(1500);
      expect(result.payrollSurplus.subscriptions).toBe(600);
      expect(result.payrollSurplus.msi).toBe(4000);
      expect(result.payrollSurplus.fixedCommitments).toBe(6100);
      expect(result.payrollSurplus.initialDiscretionaryPayrollSurplus).toBe(18900); // 25000 - 6100
      expect(result.payrollSurplus.regularExpenses).toBe(3000);
      expect(result.payrollSurplus.remainingDiscretionaryPayrollSurplus).toBe(15900); // 18900 - 3000
    });

    it('should correctly calculate netBalance vs cashInPocketBalance with unreceived income and unpaid expenses', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      // Total expenses: $9100, but only $6100 paid
      mockExpenseModel.aggregate.mockResolvedValue([
        { _id: ExpenseCategory.SERVICE, totalAmount: 1500, totalPaid: 1500, count: 1 },
        { _id: ExpenseCategory.SUBSCRIPTION, totalAmount: 600, totalPaid: 600, count: 1 },
        { _id: ExpenseCategory.MSI, totalAmount: 4000, totalPaid: 4000, count: 1 },
        { _id: ExpenseCategory.REGULAR_EXPENSE, totalAmount: 3000, totalPaid: 0, count: 1 },
      ]);

      // Total income: $26500 ($25000 received payroll + $1500 unreceived debt collection)
      mockIncomeModel.aggregate
        .mockResolvedValueOnce([
          { _id: IncomeSource.PAYROLL, totalAmount: 25000, totalReceived: 25000, count: 1 },
          { _id: IncomeSource.DEBT_COLLECTION, totalAmount: 1500, totalReceived: 0, count: 1 },
        ])
        .mockResolvedValueOnce([
          {
            _id: new Types.ObjectId(mockPersonId),
            amount: 1500,
            pendingCount: 1,
            earliestDueDate: new Date('2026-10-05'),
            personInfo: { name: 'Carlos Mendoza' },
          },
        ]);

      const result = await service.getSummaryByYearAndMonth(mockUserId, 2026, 9);

      // (5000 + 26500) - 9100 = 22400
      expect(result.netBalance).toBe(22400);
      // (5000 + 25000) - 6100 = 23900
      expect(result.cashInPocketBalance).toBe(23900);

      // Receivables summary
      expect(result.receivables.pendingDebtCollections).toBe(1500);
      expect(result.receivables.debtors).toHaveLength(1);
      expect(result.receivables.debtors[0]).toEqual({
        personId: mockPersonId,
        name: 'Carlos Mendoza',
        amount: 1500,
        earliestDueDate: '2026-10-05',
        pendingCount: 1,
      });
    });
  });

  describe('getCurrentSummary', () => {
    it('should find current calendar period or fallback to the most recent period', async () => {
      // First call returns null for exact current month, second call finds latest
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      mockBudgetPeriodModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(null),
        })
        .mockReturnValueOnce({
          sort: sortMock,
        });

      mockExpenseModel.aggregate.mockResolvedValue([]);
      mockIncomeModel.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.getCurrentSummary(mockUserId);

      expect(result.periodId).toBe(mockPeriodId);
      expect(result.year).toBe(2026);
      expect(result.month).toBe(9);
    });

    it('should throw NotFoundException if no period is found at all', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockBudgetPeriodModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(null),
        })
        .mockReturnValueOnce({
          sort: sortMock,
        });

      await expect(service.getCurrentSummary(mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummaryByYearAndMonth', () => {
    it('should throw NotFoundException if specific period is not found', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getSummaryByYearAndMonth(mockUserId, 2026, 12)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
