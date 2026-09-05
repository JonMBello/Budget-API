import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { BudgetMetricsService } from './services/budget-metrics.service';
import { BudgetPeriodStatus } from './schemas/budget-period.schema';

describe('BudgetsController', () => {
  let controller: BudgetsController;
  let service: BudgetsService;
  let metricsService: BudgetMetricsService;

  const mockUserId = '654321654321654321654321';
  const mockPeriodId = '111111111111111111111111';

  const mockPeriodDoc: any = {
    _id: new Types.ObjectId(mockPeriodId),
    userId: new Types.ObjectId(mockUserId),
    year: 2026,
    month: 9,
    status: BudgetPeriodStatus.OPEN,
    carriedSavings: 5000,
    totalIncome: 15000,
    totalExpenses: 10000,
    notes: 'September budget',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  const mockBudgetsService = {
    initializePeriod: jest.fn(),
    findAllByUser: jest.fn(),
    getCurrentPeriod: jest.fn(),
    findByYearAndMonth: jest.fn(),
    updateSavings: jest.fn(),
    updateStatus: jest.fn(),
    updateIncome: jest.fn(),
    update: jest.fn(),
  };

  const mockBudgetMetricsService = {
    getCurrentSummary: jest.fn(),
    getSummaryByYearAndMonth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [
        {
          provide: BudgetsService,
          useValue: mockBudgetsService,
        },
        {
          provide: BudgetMetricsService,
          useValue: mockBudgetMetricsService,
        },
      ],
    }).compile();

    controller = module.get<BudgetsController>(BudgetsController);
    service = module.get<BudgetsService>(BudgetsService);
    metricsService = module.get<BudgetMetricsService>(BudgetMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize a budget period and return mapped response with netBalance', async () => {
      mockBudgetsService.initializePeriod.mockResolvedValue(mockPeriodDoc);

      const result = await controller.initialize(mockUserId, {
        year: 2026,
        month: 9,
      });

      expect(result).toEqual({
        id: mockPeriodId,
        userId: mockUserId,
        year: 2026,
        month: 9,
        status: BudgetPeriodStatus.OPEN,
        carriedSavings: 5000,
        totalIncome: 15000,
        totalExpenses: 10000,
        netBalance: 10000, // 5000 + 15000 - 10000
        notes: 'September budget',
        createdAt: mockPeriodDoc.createdAt,
        updatedAt: mockPeriodDoc.updatedAt,
      });
      expect(service.initializePeriod).toHaveBeenCalledWith(mockUserId, {
        year: 2026,
        month: 9,
      });
    });
  });

  describe('findAll', () => {
    it('should return list of budget periods mapped to response DTOs', async () => {
      mockBudgetsService.findAllByUser.mockResolvedValue([mockPeriodDoc]);

      const result = await controller.findAll(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockPeriodId);
      expect(result[0].netBalance).toBe(10000);
      expect(service.findAllByUser).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getCurrent', () => {
    it('should return current period mapped to response DTO', async () => {
      mockBudgetsService.getCurrentPeriod.mockResolvedValue(mockPeriodDoc);

      const result = await controller.getCurrent(mockUserId);

      expect(result.id).toBe(mockPeriodId);
      expect(service.getCurrentPeriod).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('findOne', () => {
    it('should return period details by year and month', async () => {
      mockBudgetsService.findByYearAndMonth.mockResolvedValue(mockPeriodDoc);

      const result = await controller.findOne(mockUserId, 2026, 9);

      expect(result.id).toBe(mockPeriodId);
      expect(service.findByYearAndMonth).toHaveBeenCalledWith(mockUserId, 2026, 9);
    });
  });

  describe('updateSavings', () => {
    it('should update carried savings and return updated response', async () => {
      const updatedDoc = {
        ...mockPeriodDoc,
        carriedSavings: 4000,
      };
      mockBudgetsService.updateSavings.mockResolvedValue(updatedDoc);

      const result = await controller.updateSavings(mockUserId, 2026, 9, {
        carriedSavings: 4000,
      });

      expect(result.carriedSavings).toBe(4000);
      expect(result.netBalance).toBe(9000); // 4000 + 15000 - 10000
      expect(service.updateSavings).toHaveBeenCalledWith(mockUserId, 2026, 9, {
        carriedSavings: 4000,
      });
    });
  });

  describe('updateStatus', () => {
    it('should update status and return updated response', async () => {
      const updatedDoc = {
        ...mockPeriodDoc,
        status: BudgetPeriodStatus.CLOSED,
      };
      mockBudgetsService.updateStatus.mockResolvedValue(updatedDoc);

      const result = await controller.updateStatus(mockUserId, 2026, 9, {
        status: BudgetPeriodStatus.CLOSED,
      });

      expect(result.status).toBe(BudgetPeriodStatus.CLOSED);
      expect(service.updateStatus).toHaveBeenCalledWith(mockUserId, 2026, 9, {
        status: BudgetPeriodStatus.CLOSED,
      });
    });
  });

  describe('updateIncome', () => {
    it('should update total income and return updated response with recalculated netBalance', async () => {
      const updatedDoc = {
        ...mockPeriodDoc,
        totalIncome: 25000,
      };
      mockBudgetsService.updateIncome.mockResolvedValue(updatedDoc);

      const result = await controller.updateIncome(mockUserId, 2026, 9, {
        totalIncome: 25000,
      });

      expect(result.totalIncome).toBe(25000);
      expect(result.netBalance).toBe(20000); // 5000 + 25000 - 10000
      expect(service.updateIncome).toHaveBeenCalledWith(mockUserId, 2026, 9, {
        totalIncome: 25000,
      });
    });
  });

  describe('update', () => {
    it('should update multiple fields and return updated response', async () => {
      const updatedDoc = {
        ...mockPeriodDoc,
        totalIncome: 20000,
        carriedSavings: 6000,
        totalExpenses: 8000,
        notes: 'Adjusted budget',
      };
      mockBudgetsService.update.mockResolvedValue(updatedDoc);

      const result = await controller.update(mockUserId, 2026, 9, {
        totalIncome: 20000,
        carriedSavings: 6000,
        totalExpenses: 8000,
        notes: 'Adjusted budget',
      });

      expect(result.totalIncome).toBe(20000);
      expect(result.carriedSavings).toBe(6000);
      expect(result.totalExpenses).toBe(8000);
      expect(result.netBalance).toBe(18000); // 6000 + 20000 - 8000
      expect(service.update).toHaveBeenCalledWith(mockUserId, 2026, 9, {
        totalIncome: 20000,
        carriedSavings: 6000,
        totalExpenses: 8000,
        notes: 'Adjusted budget',
      });
    });
  });

  describe('getCurrentSummary', () => {
    it('should delegate to budgetMetricsService.getCurrentSummary and return metrics DTO', async () => {
      const mockSummary: any = {
        periodId: mockPeriodId,
        year: 2026,
        month: 9,
        netBalance: 20900,
      };

      mockBudgetMetricsService.getCurrentSummary.mockResolvedValue(mockSummary);

      const result = await controller.getCurrentSummary(mockUserId);

      expect(metricsService.getCurrentSummary).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getSummaryByYearAndMonth', () => {
    it('should delegate to budgetMetricsService.getSummaryByYearAndMonth and return metrics DTO', async () => {
      const mockSummary: any = {
        periodId: mockPeriodId,
        year: 2026,
        month: 9,
        netBalance: 20900,
      };

      mockBudgetMetricsService.getSummaryByYearAndMonth.mockResolvedValue(mockSummary);

      const result = await controller.getSummaryByYearAndMonth(mockUserId, 2026, 9);

      expect(metricsService.getSummaryByYearAndMonth).toHaveBeenCalledWith(mockUserId, 2026, 9);
      expect(result).toEqual(mockSummary);
    });
  });
});
