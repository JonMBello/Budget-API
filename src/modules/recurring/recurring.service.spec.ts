import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RecurringService } from './recurring.service';
import {
  RecurringCategory,
  RecurringTemplate,
  SplitType,
} from './schemas/recurring-template.schema';
import { Currency } from '../users/schemas/user.schema';
import { Expense } from '../expenses/schemas/expense.schema';
import { Income, IncomeSource } from '../incomes/schemas/income.schema';
import { BudgetPeriod, BudgetPeriodStatus } from '../budgets/schemas/budget-period.schema';
import { Person } from '../people/schemas/person.schema';
import { CardsService } from '../cards/cards.service';
import { BudgetsService } from '../budgets/budgets.service';
import { AccountCardType } from '../../common/utils/card-cycle.util';

describe('RecurringService', () => {
  let service: RecurringService;
  let mockRecurringModel: any;
  let mockExpenseModel: any;
  let mockIncomeModel: any;
  let mockBudgetPeriodModel: any;
  let mockPersonModel: any;
  let mockCardsService: any;
  let mockBudgetsService: any;
  let mockConnection: any;
  let mockSession: any;

  const mockUserId = '654321654321654321654321';
  const mockTemplateId = '111111111111111111111111';
  const mockPeriodId = '555555555555555555555555';
  const mockPersonId = '999999999999999999999999';

  const mockServiceDoc: any = {
    _id: new Types.ObjectId(mockTemplateId),
    userId: new Types.ObjectId(mockUserId),
    title: 'Internet Fibra',
    category: RecurringCategory.SERVICE,
    amount: 650,
    currency: Currency.MXN,
    exchangeRate: 1.0,
    isActive: true,
    isCompleted: false,
    save: jest.fn(),
  };

  const mockMsiDoc: any = {
    _id: new Types.ObjectId(mockTemplateId),
    userId: new Types.ObjectId(mockUserId),
    title: 'PlayStation 5',
    category: RecurringCategory.MSI,
    amount: 1500,
    totalAmount: 9000,
    totalInstallments: 6,
    currentInstallment: 1,
    currency: Currency.MXN,
    exchangeRate: 1.0,
    isActive: true,
    isCompleted: false,
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockRecurringModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(mockTemplateId),
      save: jest.fn().mockResolvedValue(dto),
    }));
    mockRecurringModel.find = jest.fn();
    mockRecurringModel.findOne = jest.fn();
    mockRecurringModel.findByIdAndUpdate = jest.fn();

    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    mockExpenseModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    }));
    mockExpenseModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });
    mockExpenseModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockExpenseModel.deleteMany = jest.fn().mockReturnValue({
      catch: jest.fn().mockResolvedValue({}),
    });

    mockIncomeModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    }));
    mockIncomeModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });
    mockIncomeModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockIncomeModel.deleteMany = jest.fn().mockReturnValue({
      catch: jest.fn().mockResolvedValue({}),
    });

    mockBudgetPeriodModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockPeriodId),
          userId: new Types.ObjectId(mockUserId),
          year: 2026,
          month: 9,
          status: BudgetPeriodStatus.OPEN,
        }),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
    };

    mockPersonModel = {
      findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest
          .fn()
          .mockResolvedValue({ _id: new Types.ObjectId(mockPersonId), name: 'Carlos' }),
      }),
    };

    mockCardsService = {
      findOne: jest.fn().mockResolvedValue({
        type: AccountCardType.CREDIT,
        cutoffDay: 15,
        paymentDueDay: 5,
      }),
    };

    mockBudgetsService = {
      syncTotals: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringService,
        {
          provide: getModelToken(RecurringTemplate.name),
          useValue: mockRecurringModel,
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
          provide: getModelToken(BudgetPeriod.name),
          useValue: mockBudgetPeriodModel,
        },
        {
          provide: getModelToken(Person.name),
          useValue: mockPersonModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: CardsService,
          useValue: mockCardsService,
        },
        {
          provide: BudgetsService,
          useValue: mockBudgetsService,
        },
      ],
    }).compile();

    service = module.get<RecurringService>(RecurringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a recurring service without MSI fields', async () => {
      const result = await service.create(mockUserId, {
        title: 'Internet Fibra',
        category: RecurringCategory.SERVICE,
        amount: 650,
      });

      expect(mockRecurringModel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Types.ObjectId),
          title: 'Internet Fibra',
          category: RecurringCategory.SERVICE,
          amount: 650,
          totalAmount: null,
          totalInstallments: null,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should calculate monthly amount for MSI when totalAmount and totalInstallments are given', async () => {
      await service.create(mockUserId, {
        title: 'PlayStation 5',
        category: RecurringCategory.MSI,
        totalAmount: 9000,
        totalInstallments: 6,
      });

      expect(mockRecurringModel).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1500,
          totalAmount: 9000,
          totalInstallments: 6,
          currentInstallment: 1,
        }),
      );
    });

    it('should calculate split amount correctly when split is provided', async () => {
      await service.create(mockUserId, {
        title: 'Netflix Shared',
        category: RecurringCategory.SUBSCRIPTION,
        amount: 200,
        split: {
          personId: mockPersonId,
          splitType: SplitType.PERCENTAGE,
          splitValue: 50,
        },
      });

      expect(mockRecurringModel).toHaveBeenCalledWith(
        expect.objectContaining({
          split: expect.objectContaining({
            personId: expect.any(Types.ObjectId),
            splitType: SplitType.PERCENTAGE,
            splitValue: 50,
            splitAmount: 100,
          }),
        }),
      );
    });

    it('should throw BadRequestException if MSI has less than 2 installments', async () => {
      await expect(
        service.create(mockUserId, {
          title: 'TV',
          category: RecurringCategory.MSI,
          totalInstallments: 1,
          totalAmount: 5000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if non-MSI is missing amount', async () => {
      await expect(
        service.create(mockUserId, {
          title: 'Service',
          category: RecurringCategory.SERVICE,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByUser', () => {
    it('should return active templates by default sorted by createdAt', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockServiceDoc]),
      });
      mockRecurringModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAllByUser(mockUserId);

      expect(result).toEqual([mockServiceDoc]);
      expect(mockRecurringModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        isActive: true,
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should filter by category when provided', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockMsiDoc]),
      });
      mockRecurringModel.find.mockReturnValue({ sort: sortMock });

      await service.findAllByUser(mockUserId, false, RecurringCategory.MSI);

      expect(mockRecurringModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        isActive: true,
        category: RecurringCategory.MSI,
      });
    });
  });

  describe('findOne', () => {
    it('should return template by ID', async () => {
      mockRecurringModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockServiceDoc),
      });

      const result = await service.findOne(mockUserId, mockTemplateId);
      expect(result).toEqual(mockServiceDoc);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(service.findOne(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if template not found', async () => {
      mockRecurringModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(mockUserId, mockTemplateId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('advanceMsi', () => {
    it('should advance MSI installment by specified count', async () => {
      const msiInstance = {
        ...mockMsiDoc,
        currentInstallment: 1,
        totalInstallments: 6,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      mockRecurringModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(msiInstance),
      });

      const result = await service.advanceMsi(mockUserId, mockTemplateId, { installmentsCount: 2 });
      expect(result.currentInstallment).toBe(3);
      expect(result.isCompleted).toBe(false);
    });

    it('should complete and deactivate MSI if payAll is true', async () => {
      const msiInstance = {
        ...mockMsiDoc,
        currentInstallment: 2,
        totalInstallments: 6,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      mockRecurringModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(msiInstance),
      });

      const result = await service.advanceMsi(mockUserId, mockTemplateId, { payAll: true });
      expect(result.currentInstallment).toBe(6);
      expect(result.isCompleted).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException if attempting to advance a non-MSI template', async () => {
      mockRecurringModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockServiceDoc),
      });

      await expect(
        service.advanceMsi(mockUserId, mockTemplateId, { installmentsCount: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should deactivate template immediately', async () => {
      const instance = {
        ...mockServiceDoc,
        isActive: true,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      mockRecurringModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(instance),
      });

      const result = await service.cancel(mockUserId, mockTemplateId);
      expect(result.isActive).toBe(false);
    });
  });

  describe('instantiateForPeriod', () => {
    it('should successfully instantiate service and MSI into requested period, creating real expenses and advancing MSI', async () => {
      const serviceItem = {
        ...mockServiceDoc,
        _id: new Types.ObjectId('111111111111111111111111'),
        title: 'Internet Fibra',
        category: RecurringCategory.SERVICE,
        amount: 650,
      };

      const msiItem = {
        ...mockMsiDoc,
        _id: new Types.ObjectId('222222222222222222222222'),
        title: 'PlayStation 5',
        category: RecurringCategory.MSI,
        amount: 1500,
        currentInstallment: 1,
        totalInstallments: 3,
        isCompleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([serviceItem, msiItem]),
      });

      const result = await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(result.periodId).toBe(mockPeriodId);
      expect(result.year).toBe(2026);
      expect(result.month).toBe(9);
      expect(result.createdCount).toBe(2);
      expect(result.skippedCount).toBe(0);

      expect(mockExpenseModel).toHaveBeenCalledTimes(2);
      expect(msiItem.currentInstallment).toBe(2);
      expect(msiItem.lastInstantiatedYear).toBe(2026);
      expect(msiItem.lastInstantiatedMonth).toBe(9);
      expect(msiItem.save).toHaveBeenCalled();
      expect(mockBudgetsService.syncTotals).toHaveBeenCalled();
    });

    it('should support a requested period that differs from current calendar month', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockPeriodId),
          userId: new Types.ObjectId(mockUserId),
          year: 2027,
          month: 3,
          status: BudgetPeriodStatus.OPEN,
        }),
      });

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockServiceDoc]),
      });

      const result = await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(result.year).toBe(2027);
      expect(result.month).toBe(3);
      expect(result.createdCount).toBe(1);
    });

    it('should reject with 400 if periodId is not a valid Mongo ObjectId', async () => {
      await expect(service.instantiateForPeriod(mockUserId, 'invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject with 404 if budget period does not exist or belongs to another user', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.instantiateForPeriod(mockUserId, mockPeriodId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject with 409 if budget period is closed', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockPeriodId),
          userId: new Types.ObjectId(mockUserId),
          year: 2026,
          month: 9,
          status: BudgetPeriodStatus.CLOSED,
        }),
      });

      await expect(service.instantiateForPeriod(mockUserId, mockPeriodId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should ignore future templates, inactive templates, and completed MSI without counting them as skipped', async () => {
      const futureTemplate = {
        ...mockServiceDoc,
        _id: new Types.ObjectId('333333333333333333333333'),
        startDate: '2026-11-01',
      };

      const completedMsi = {
        ...mockMsiDoc,
        _id: new Types.ObjectId('444444444444444444444444'),
        isCompleted: true,
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([futureTemplate, completedMsi]),
      });

      const result = await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(mockExpenseModel).not.toHaveBeenCalled();
    });

    it('should be idempotent: retry on same period returns createdCount: 0 and skippedCount with existing templates', async () => {
      const existingServiceTemplateId = new Types.ObjectId('111111111111111111111111');
      const serviceItem = {
        ...mockServiceDoc,
        _id: existingServiceTemplateId,
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([serviceItem]),
      });

      // Existing expense in DB for this template and period
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(),
            periodId: new Types.ObjectId(mockPeriodId),
            templateId: existingServiceTemplateId,
          },
        ]),
      });

      const result = await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(mockExpenseModel).not.toHaveBeenCalled();
    });

    it('should complete MSI when instantiating final installment', async () => {
      const finalMsiItem = {
        ...mockMsiDoc,
        _id: new Types.ObjectId('222222222222222222222222'),
        title: 'PlayStation 5',
        category: RecurringCategory.MSI,
        amount: 1500,
        totalAmount: 4500,
        currentInstallment: 3,
        totalInstallments: 3,
        isCompleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([finalMsiItem]),
      });

      const result = await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(result.createdCount).toBe(1);
      expect(finalMsiItem.isCompleted).toBe(true);
      expect(finalMsiItem.isActive).toBe(false);
      expect(finalMsiItem.save).toHaveBeenCalled();
    });

    it('should adjust cents on the final MSI installment to absorb rounding discrepancies', async () => {
      // 1000 in 3 installments: 333.33 each, final should be 333.34
      const msiItem = {
        ...mockMsiDoc,
        _id: new Types.ObjectId('222222222222222222222222'),
        title: 'Laptop Dell',
        category: RecurringCategory.MSI,
        amount: 333.33,
        totalAmount: 1000,
        currentInstallment: 3,
        totalInstallments: 3,
        isCompleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([msiItem]),
      });

      await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(mockExpenseModel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Laptop Dell (Cuota 3/3)',
          amount: 333.34, // 1000 - (333.33 * 2) = 333.34
        }),
      );
    });

    it('should create linked debt collection income when template has split configuration', async () => {
      const splitTemplate = {
        ...mockServiceDoc,
        _id: new Types.ObjectId('111111111111111111111111'),
        amount: 200,
        split: {
          personId: new Types.ObjectId(mockPersonId),
          splitType: SplitType.PERCENTAGE,
          splitValue: 50,
          splitAmount: 100,
        },
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([splitTemplate]),
      });

      await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(mockIncomeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          source: IncomeSource.DEBT_COLLECTION,
          amount: 100,
          title: 'Cobro a Carlos: Internet Fibra',
          isReceived: false,
        }),
      );
    });

    it('should not advance MSI installment again if the generated expense was deleted in that period', async () => {
      // MSI was already instantiated for 2026-09 (lastInstantiatedYear: 2026, month: 9, current: 2)
      const msiItem = {
        ...mockMsiDoc,
        _id: new Types.ObjectId('222222222222222222222222'),
        currentInstallment: 2,
        totalInstallments: 6,
        lastInstantiatedYear: 2026,
        lastInstantiatedMonth: 9,
        save: jest.fn(),
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([msiItem]),
      });

      // No expense in DB because user deleted it
      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(msiItem.currentInstallment).toBe(2); // Did NOT advance to 3
      expect(mockExpenseModel).not.toHaveBeenCalled();
    });

    it('should avoid assigning cuotas out of order if requested period is older than last instantiated period', async () => {
      // MSI was already instantiated up to 2026-10
      const msiItem = {
        ...mockMsiDoc,
        _id: new Types.ObjectId('222222222222222222222222'),
        currentInstallment: 2,
        totalInstallments: 6,
        lastInstantiatedYear: 2026,
        lastInstantiatedMonth: 10,
        save: jest.fn(),
      };

      // Requested period is 2026-09 (before 2026-10)
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(mockPeriodId),
          userId: new Types.ObjectId(mockUserId),
          year: 2026,
          month: 9,
          status: BudgetPeriodStatus.OPEN,
        }),
      });

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([msiItem]),
      });

      const result = await service.instantiateForPeriod(mockUserId, mockPeriodId);

      expect(result.createdCount).toBe(0);
      expect(msiItem.currentInstallment).toBe(2);
      expect(mockExpenseModel).not.toHaveBeenCalled();
    });

    it('should roll back changes if an intermediate error occurs', async () => {
      const serviceItem = {
        ...mockServiceDoc,
        _id: new Types.ObjectId('111111111111111111111111'),
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([serviceItem]),
      });

      // Simulate failure on expense save
      mockExpenseModel.mockImplementationOnce(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database write error')),
      }));

      await expect(service.instantiateForPeriod(mockUserId, mockPeriodId)).rejects.toThrow(
        'Database write error',
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });
});
