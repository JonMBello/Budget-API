import { Test, TestingModule } from '@nestjs/testing';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';
import { IncomeSource } from './schemas/income.schema';
import { Types } from 'mongoose';

describe('IncomesController', () => {
  let controller: IncomesController;
  let mockIncomesService: any;

  const mockUserId = '654321654321654321654321';
  const mockPeriodId = '654321654321654321654322';
  const mockIncomeId = '654321654321654321654323';

  const mockIncomeDoc: any = {
    _id: new Types.ObjectId(mockIncomeId),
    userId: new Types.ObjectId(mockUserId),
    periodId: new Types.ObjectId(mockPeriodId),
    title: 'Salary',
    amount: 15000,
    date: new Date('2026-09-15'),
    source: IncomeSource.PAYROLL,
    isReceived: false,
    dueDate: new Date('2026-09-15'),
    debtorPersonId: null,
    linkedExpenseId: null,
    notes: 'Biweekly salary',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockIncomesService = {
      create: jest.fn().mockResolvedValue(mockIncomeDoc),
      findAllByPeriod: jest.fn().mockResolvedValue([mockIncomeDoc]),
      findOne: jest.fn().mockResolvedValue(mockIncomeDoc),
      update: jest.fn().mockResolvedValue(mockIncomeDoc),
      remove: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Income deleted successfully' }),
      copyFromPreviousMonth: jest.fn().mockResolvedValue([mockIncomeDoc]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncomesController],
      providers: [
        {
          provide: IncomesService,
          useValue: mockIncomesService,
        },
      ],
    }).compile();

    controller = module.get<IncomesController>(IncomesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an income and return mapped DTO', async () => {
      const dto = {
        periodId: mockPeriodId,
        title: 'Salary',
        amount: 15000,
        date: '2026-09-15',
        source: IncomeSource.PAYROLL,
      };

      const result = await controller.create(mockUserId, dto);

      expect(mockIncomesService.create).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.id).toBe(mockIncomeId);
      expect(result.amount).toBe(15000);
      expect(result.source).toBe(IncomeSource.PAYROLL);
    });
  });

  describe('findAll', () => {
    it('should return list of incomes', async () => {
      const result = await controller.findAll(mockUserId, mockPeriodId);

      expect(mockIncomesService.findAllByPeriod).toHaveBeenCalledWith(mockUserId, mockPeriodId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockIncomeId);
    });
  });

  describe('copyFromPreviousMonth', () => {
    it('should clone incomes and return mapped DTO list', async () => {
      const dto = {
        fromPeriodId: '654321654321654321654320',
        toPeriodId: mockPeriodId,
      };

      const result = await controller.copyFromPreviousMonth(mockUserId, dto);

      expect(mockIncomesService.copyFromPreviousMonth).toHaveBeenCalledWith(mockUserId, dto);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a specific income', async () => {
      const result = await controller.findOne(mockUserId, mockIncomeId);

      expect(mockIncomesService.findOne).toHaveBeenCalledWith(mockUserId, mockIncomeId);
      expect(result.id).toBe(mockIncomeId);
    });
  });

  describe('update', () => {
    it('should update income and return mapped DTO', async () => {
      const dto = { amount: 18000 };

      const result = await controller.update(mockUserId, mockIncomeId, dto);

      expect(mockIncomesService.update).toHaveBeenCalledWith(mockUserId, mockIncomeId, dto);
      expect(result.id).toBe(mockIncomeId);
    });
  });

  describe('remove', () => {
    it('should remove income and return confirmation', async () => {
      const result = await controller.remove(mockUserId, mockIncomeId);

      expect(mockIncomesService.remove).toHaveBeenCalledWith(mockUserId, mockIncomeId);
      expect(result.success).toBe(true);
    });
  });
});
