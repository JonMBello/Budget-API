import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpenseCategory } from './schemas/expense.schema';
import { SplitType } from '../recurring/schemas/recurring-template.schema';
import { Types } from 'mongoose';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let mockExpensesService: any;

  const mockUserId = '654321654321654321654321';
  const mockPeriodId = '654321654321654321654322';
  const mockExpenseId = '654321654321654321654323';
  const mockPersonId = '654321654321654321654325';
  const mockIncomeId = '654321654321654321654326';

  const mockExpenseDoc: any = {
    _id: new Types.ObjectId(mockExpenseId),
    userId: new Types.ObjectId(mockUserId),
    periodId: new Types.ObjectId(mockPeriodId),
    templateId: null,
    cardId: null,
    title: 'Grocery shopping',
    amount: 850,
    category: ExpenseCategory.FOOD,
    date: new Date('2026-09-02'),
    paymentDueDate: null,
    isPaid: true,
    split: {
      personId: new Types.ObjectId(mockPersonId),
      splitType: SplitType.PERCENTAGE,
      splitValue: 50,
      splitAmount: 425,
      isDebtActive: true,
      linkedIncomeId: new Types.ObjectId(mockIncomeId),
    },
    notes: 'Costco run',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockExpensesService = {
      create: jest.fn().mockResolvedValue(mockExpenseDoc),
      findAllByPeriod: jest.fn().mockResolvedValue([mockExpenseDoc]),
      findOne: jest.fn().mockResolvedValue(mockExpenseDoc),
      update: jest.fn().mockResolvedValue(mockExpenseDoc),
      remove: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Expense deleted successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        {
          provide: ExpensesService,
          useValue: mockExpensesService,
        },
      ],
    }).compile();

    controller = module.get<ExpensesController>(ExpensesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an expense and return mapped response with split info', async () => {
      const dto = {
        periodId: mockPeriodId,
        title: 'Grocery shopping',
        amount: 850,
        category: ExpenseCategory.FOOD,
        date: '2026-09-02',
      };

      const result = await controller.create(mockUserId, dto);

      expect(mockExpensesService.create).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.id).toBe(mockExpenseId);
      expect(result.amount).toBe(850);
      expect(result.split).toBeDefined();
      expect(result.split?.personId).toBe(mockPersonId);
      expect(result.split?.splitAmount).toBe(425);
    });
  });

  describe('findAll', () => {
    it('should query expenses by period and category', async () => {
      const result = await controller.findAll(mockUserId, mockPeriodId, ExpenseCategory.FOOD);

      expect(mockExpensesService.findAllByPeriod).toHaveBeenCalledWith(
        mockUserId,
        mockPeriodId,
        ExpenseCategory.FOOD,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockExpenseId);
    });
  });

  describe('findOne', () => {
    it('should return a single expense by id', async () => {
      const result = await controller.findOne(mockUserId, mockExpenseId);

      expect(mockExpensesService.findOne).toHaveBeenCalledWith(mockUserId, mockExpenseId);
      expect(result.id).toBe(mockExpenseId);
    });
  });

  describe('update', () => {
    it('should update expense and return mapped response', async () => {
      const dto = { amount: 900 };

      const result = await controller.update(mockUserId, mockExpenseId, dto);

      expect(mockExpensesService.update).toHaveBeenCalledWith(mockUserId, mockExpenseId, dto);
      expect(result.id).toBe(mockExpenseId);
    });
  });

  describe('remove', () => {
    it('should delete expense and return success confirmation', async () => {
      const result = await controller.remove(mockUserId, mockExpenseId);

      expect(mockExpensesService.remove).toHaveBeenCalledWith(mockUserId, mockExpenseId);
      expect(result.success).toBe(true);
    });
  });
});
