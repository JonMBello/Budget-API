import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ExpensesService } from './expenses.service';
import { Expense, ExpenseCategory } from './schemas/expense.schema';
import { Person } from '../people/schemas/person.schema';
import { CardsService } from '../cards/cards.service';
import { IncomesService } from '../incomes/incomes.service';
import { BudgetsService } from '../budgets/budgets.service';
import { SplitType } from '../recurring/schemas/recurring-template.schema';
import { AccountCardType } from '../../common/utils/card-cycle.util';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockExpenseModel: any;
  let mockPersonModel: any;
  let mockCardsService: any;
  let mockIncomesService: any;
  let mockBudgetsService: any;

  const mockUserId = '654321654321654321654321';
  const mockPeriodId = '654321654321654321654322';
  const mockExpenseId = '654321654321654321654323';
  const mockCardId = '654321654321654321654324';
  const mockPersonId = '654321654321654321654325';
  const mockIncomeId = '654321654321654321654326';

  let mockExpenseDoc: any;

  beforeEach(async () => {
    mockExpenseDoc = {
      _id: new Types.ObjectId(mockExpenseId),
      userId: new Types.ObjectId(mockUserId),
      periodId: new Types.ObjectId(mockPeriodId),
      cardId: new Types.ObjectId(mockCardId),
      title: 'Dinner with friends',
      amount: 1000,
      category: ExpenseCategory.FOOD,
      date: new Date('2026-09-02'),
      paymentDueDate: new Date('2026-10-05'),
      isPaid: false,
      split: null,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
      markModified: jest.fn(),
    };

    mockExpenseModel = jest.fn().mockImplementation((fields) => {
      const doc = {
        ...mockExpenseDoc,
        ...fields,
        _id: new Types.ObjectId(mockExpenseId),
      };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    });
    mockExpenseModel.find = jest.fn();
    mockExpenseModel.findOne = jest.fn();
    mockExpenseModel.findByIdAndUpdate = jest.fn();
    mockExpenseModel.findByIdAndDelete = jest.fn();

    mockPersonModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ _id: new Types.ObjectId(mockPersonId), name: 'Carlos' }),
      }),
    };

    mockCardsService = {
      findOne: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(mockCardId),
        type: AccountCardType.CREDIT,
        cutoffDay: 15,
        paymentDueDay: 5,
      }),
      previewStatement: jest.fn().mockResolvedValue({
        paymentDueDate: new Date('2026-10-05'),
      }),
    };

    mockIncomesService = {
      create: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(mockIncomeId),
        title: 'Cobro a Carlos: Dinner with friends',
        amount: 500,
        isReceived: false,
      }),
      update: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(mockIncomeId),
        isReceived: false,
      }),
      remove: jest.fn().mockResolvedValue({ success: true }),
      markAsReceived: jest.fn().mockResolvedValue({}),
      calculateTotalIncomeByPeriod: jest.fn().mockResolvedValue(15000),
    };

    mockBudgetsService = {
      syncTotals: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getModelToken(Expense.name),
          useValue: mockExpenseModel,
        },
        {
          provide: getModelToken(Person.name),
          useValue: mockPersonModel,
        },
        {
          provide: CardsService,
          useValue: mockCardsService,
        },
        {
          provide: IncomesService,
          useValue: mockIncomesService,
        },
        {
          provide: BudgetsService,
          useValue: mockBudgetsService,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an expense without split or card and sync budget totals', async () => {
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
      });

      const result = await service.create(mockUserId, {
        periodId: mockPeriodId,
        title: 'Groceries',
        amount: 500,
        category: ExpenseCategory.FOOD,
        date: '2026-09-02',
      });

      expect(result).toBeDefined();
      expect(mockBudgetsService.syncTotals).toHaveBeenCalledWith(
        mockUserId,
        mockPeriodId,
        15000,
        expect.any(Number),
      );
    });

    it('should calculate paymentDueDate when paid with a credit card', async () => {
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
      });

      await service.create(mockUserId, {
        periodId: mockPeriodId,
        cardId: mockCardId,
        title: 'Electronics',
        amount: 2500,
        category: ExpenseCategory.OTHER,
        date: '2026-09-10',
      });

      expect(mockCardsService.findOne).toHaveBeenCalledWith(mockUserId, mockCardId);
      expect(mockCardsService.previewStatement).toHaveBeenCalled();
    });

    it('should create a projected income when expense includes a split', async () => {
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
      });

      const result = await service.create(mockUserId, {
        periodId: mockPeriodId,
        title: 'Team lunch',
        amount: 600,
        category: ExpenseCategory.FOOD,
        date: '2026-09-02',
        split: {
          personId: mockPersonId,
          splitType: SplitType.PERCENTAGE,
          splitValue: 50,
          isDebtActive: true,
        },
      });

      expect(mockIncomesService.create).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          amount: 300,
          periodId: mockPeriodId,
          debtorPersonId: mockPersonId,
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('findAllByPeriod', () => {
    it('should filter by periodId and category', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
      });
      mockExpenseModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAllByPeriod(mockUserId, mockPeriodId, ExpenseCategory.FOOD);

      expect(result).toEqual([mockExpenseDoc]);
      expect(mockExpenseModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        periodId: expect.any(Types.ObjectId),
        category: ExpenseCategory.FOOD,
      });
    });
  });

  describe('findOne', () => {
    it('should return expense when found and owned by user', async () => {
      mockExpenseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockExpenseDoc),
      });

      const result = await service.findOne(mockUserId, mockExpenseId);
      expect(result).toEqual(mockExpenseDoc);
    });

    it('should throw NotFoundException if id is invalid or not found', async () => {
      await expect(service.findOne(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);

      mockExpenseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne(mockUserId, mockExpenseId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update expense and synchronize linked income split amount', async () => {
      const expenseWithSplit = {
        ...mockExpenseDoc,
        split: {
          personId: new Types.ObjectId(mockPersonId),
          splitType: SplitType.PERCENTAGE,
          splitValue: 50,
          splitAmount: 500,
          isDebtActive: true,
          linkedIncomeId: new Types.ObjectId(mockIncomeId),
        },
      };

      mockExpenseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expenseWithSplit),
      });
      mockExpenseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...expenseWithSplit, amount: 1200 }),
      });
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([expenseWithSplit]),
      });

      const result = await service.update(mockUserId, mockExpenseId, {
        amount: 1200,
      });

      expect(mockIncomesService.update).toHaveBeenCalledWith(
        mockUserId,
        mockIncomeId,
        expect.objectContaining({ amount: 600 }),
      );
      expect(result).toBeDefined();
    });

    it('should delete linked income if split is explicitly set to null', async () => {
      const expenseWithSplit = {
        ...mockExpenseDoc,
        split: {
          personId: new Types.ObjectId(mockPersonId),
          linkedIncomeId: new Types.ObjectId(mockIncomeId),
        },
      };

      mockExpenseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expenseWithSplit),
      });
      mockExpenseModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...expenseWithSplit, split: null }),
      });
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
      });

      await service.update(mockUserId, mockExpenseId, {
        split: null as any,
      });

      expect(mockIncomesService.remove).toHaveBeenCalledWith(mockUserId, mockIncomeId);
    });
  });

  describe('remove', () => {
    it('should delete expense and its unreceived linked income', async () => {
      const expenseWithSplit = {
        ...mockExpenseDoc,
        split: {
          linkedIncomeId: new Types.ObjectId(mockIncomeId),
        },
      };

      mockExpenseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expenseWithSplit),
      });
      mockExpenseModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expenseWithSplit),
      });
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.remove(mockUserId, mockExpenseId);

      expect(result.success).toBe(true);
      expect(mockIncomesService.remove).toHaveBeenCalledWith(mockUserId, mockIncomeId);
      expect(mockBudgetsService.syncTotals).toHaveBeenCalled();
    });
  });

  describe('findPendingDebtsByPerson', () => {
    it('should return pending split debts for a given person', async () => {
      const populateMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
      });
      mockExpenseModel.find.mockReturnValue({ populate: populateMock });

      const result = await service.findPendingDebtsByPerson(mockUserId, mockPersonId);

      expect(result).toEqual([mockExpenseDoc]);
      expect(mockExpenseModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        'split.personId': expect.any(Types.ObjectId),
        'split.isDebtActive': true,
      });
    });
  });

  describe('markSplitAsPaid', () => {
    it('should set split.isDebtActive to false and mark linked income as received', async () => {
      const expenseWithSplit = {
        ...mockExpenseDoc,
        split: {
          isDebtActive: true,
          linkedIncomeId: new Types.ObjectId(mockIncomeId),
        },
        save: jest.fn().mockResolvedValue(true),
        markModified: jest.fn(),
      };

      mockExpenseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expenseWithSplit),
      });

      const result = await service.markSplitAsPaid(mockUserId, mockExpenseId);

      expect(result.split!.isDebtActive).toBe(false);
      expect(mockIncomesService.markAsReceived).toHaveBeenCalledWith(
        mockUserId,
        mockIncomeId,
        true,
      );
      expect(expenseWithSplit.save).toHaveBeenCalled();
    });
  });

  describe('calculateTotalExpensesByPeriod', () => {
    it('should calculate sum of expenses in period', async () => {
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ amount: 150 }, { amount: 350.5 }]),
      });

      const total = await service.calculateTotalExpensesByPeriod(mockUserId, mockPeriodId);
      expect(total).toBe(500.5);
    });
  });
});
