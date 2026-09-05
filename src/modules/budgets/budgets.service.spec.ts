import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BudgetsService } from './budgets.service';
import { BudgetPeriod, BudgetPeriodStatus } from './schemas/budget-period.schema';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let mockBudgetPeriodModel: any;

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
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockBudgetPeriodModel = jest.fn().mockImplementation(() => mockPeriodDoc);
    mockBudgetPeriodModel.find = jest.fn();
    mockBudgetPeriodModel.findOne = jest.fn();
    mockBudgetPeriodModel.findOneAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: getModelToken(BudgetPeriod.name),
          useValue: mockBudgetPeriodModel,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePeriod', () => {
    it('should initialize a period calculating carriedSavings from previous month', async () => {
      const prevPeriodDoc = {
        year: 2026,
        month: 8,
        carriedSavings: 2000,
        totalIncome: 15000,
        totalExpenses: 12000, // net remaining: 2000 + 15000 - 12000 = 5000
      };

      // First findOne: check duplicate (returns null)
      // Second findOne: find previous month (returns prevPeriodDoc)
      mockBudgetPeriodModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(prevPeriodDoc) });

      mockPeriodDoc.save.mockResolvedValue(mockPeriodDoc);

      const result = await service.initializePeriod(mockUserId, {
        year: 2026,
        month: 9,
      });

      expect(result).toEqual(mockPeriodDoc);
      expect(mockBudgetPeriodModel).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Types.ObjectId),
          year: 2026,
          month: 9,
          carriedSavings: 5000,
          status: BudgetPeriodStatus.OPEN,
        }),
      );
    });

    it('should use explicit carriedSavings if provided in dto', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockPeriodDoc.save.mockResolvedValue(mockPeriodDoc);

      await service.initializePeriod(mockUserId, {
        year: 2026,
        month: 9,
        carriedSavings: 8000,
      });

      expect(mockBudgetPeriodModel).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2026,
          month: 9,
          carriedSavings: 8000,
        }),
      );
    });

    it('should calculate next year and month 1 when rolling over from month 12', async () => {
      const latestPeriod = {
        year: 2026,
        month: 12,
        carriedSavings: 1000,
        totalIncome: 5000,
        totalExpenses: 2000,
      };

      // 1. findOne for latest
      // 2. findOne for check duplicate
      // 3. findOne for previous month
      mockBudgetPeriodModel.findOne
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(latestPeriod) }),
        })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(latestPeriod) });

      mockPeriodDoc.save.mockResolvedValue(mockPeriodDoc);

      await service.initializePeriod(mockUserId, {});

      expect(mockBudgetPeriodModel).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2027,
          month: 1,
          carriedSavings: 4000,
        }),
      );
    });

    it('should throw ConflictException if period already exists', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      await expect(service.initializePeriod(mockUserId, { year: 2026, month: 9 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if month is invalid', async () => {
      await expect(service.initializePeriod(mockUserId, { year: 2026, month: 13 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllByUser', () => {
    it('should return all budget periods sorted descending by year and month', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockPeriodDoc]),
      });
      mockBudgetPeriodModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAllByUser(mockUserId);

      expect(result).toEqual([mockPeriodDoc]);
      expect(mockBudgetPeriodModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
      });
      expect(sortMock).toHaveBeenCalledWith({ year: -1, month: -1 });
    });
  });

  describe('findByYearAndMonth', () => {
    it('should return period when found', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      const result = await service.findByYearAndMonth(mockUserId, 2026, 9);
      expect(result).toEqual(mockPeriodDoc);
    });

    it('should throw BadRequestException for invalid month', async () => {
      await expect(service.findByYearAndMonth(mockUserId, 2026, 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when period does not exist', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findByYearAndMonth(mockUserId, 2026, 9)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCurrentPeriod', () => {
    it('should return current calendar period if it exists', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      const result = await service.getCurrentPeriod(mockUserId);
      expect(result).toEqual(mockPeriodDoc);
    });

    it('should fallback to latest period if current calendar period does not exist', async () => {
      mockBudgetPeriodModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockPeriodDoc) }),
        });

      const result = await service.getCurrentPeriod(mockUserId);
      expect(result).toEqual(mockPeriodDoc);
    });

    it('should throw NotFoundException if no periods exist at all', async () => {
      mockBudgetPeriodModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        });

      await expect(service.getCurrentPeriod(mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSavings', () => {
    it('should update carriedSavings on an existing period', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      const updatedDoc = { ...mockPeriodDoc, carriedSavings: 4000 };
      mockBudgetPeriodModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.updateSavings(mockUserId, 2026, 9, { carriedSavings: 4000 });
      expect(result.carriedSavings).toBe(4000);
      expect(mockBudgetPeriodModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: expect.any(Types.ObjectId), year: 2026, month: 9 },
        { $set: { carriedSavings: 4000 } },
        { new: true, runValidators: true },
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status on an existing period', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      const updatedDoc = { ...mockPeriodDoc, status: BudgetPeriodStatus.CLOSED };
      mockBudgetPeriodModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.updateStatus(mockUserId, 2026, 9, {
        status: BudgetPeriodStatus.CLOSED,
      });

      expect(result.status).toBe(BudgetPeriodStatus.CLOSED);
      expect(mockBudgetPeriodModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: expect.any(Types.ObjectId), year: 2026, month: 9 },
        { $set: { status: BudgetPeriodStatus.CLOSED } },
        { new: true, runValidators: true },
      );
    });
  });

  describe('updateIncome', () => {
    it('should update totalIncome on an existing period', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      const updatedDoc = { ...mockPeriodDoc, totalIncome: 25000 };
      mockBudgetPeriodModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.updateIncome(mockUserId, 2026, 9, { totalIncome: 25000 });
      expect(result.totalIncome).toBe(25000);
      expect(mockBudgetPeriodModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: expect.any(Types.ObjectId), year: 2026, month: 9 },
        { $set: { totalIncome: 25000 } },
        { new: true, runValidators: true },
      );
    });
  });

  describe('update', () => {
    it('should update arbitrary fields on an existing period', async () => {
      mockBudgetPeriodModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPeriodDoc),
      });

      const updatedDoc = {
        ...mockPeriodDoc,
        totalIncome: 20000,
        carriedSavings: 6000,
        totalExpenses: 8000,
        notes: 'Updated notes',
      };
      mockBudgetPeriodModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.update(mockUserId, 2026, 9, {
        totalIncome: 20000,
        carriedSavings: 6000,
        totalExpenses: 8000,
        notes: 'Updated notes',
      });

      expect(result.totalIncome).toBe(20000);
      expect(result.carriedSavings).toBe(6000);
      expect(result.totalExpenses).toBe(8000);
      expect(mockBudgetPeriodModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: expect.any(Types.ObjectId), year: 2026, month: 9 },
        {
          $set: {
            totalIncome: 20000,
            carriedSavings: 6000,
            totalExpenses: 8000,
            notes: 'Updated notes',
          },
        },
        { new: true, runValidators: true },
      );
    });
  });
});
