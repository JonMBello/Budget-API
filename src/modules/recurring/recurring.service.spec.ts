import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RecurringService } from './recurring.service';
import {
  RecurringCategory,
  RecurringTemplate,
  SplitType,
} from './schemas/recurring-template.schema';
import { Currency } from '../users/schemas/user.schema';

describe('RecurringService', () => {
  let service: RecurringService;
  let mockRecurringModel: any;

  const mockUserId = '654321654321654321654321';
  const mockTemplateId = '111111111111111111111111';
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringService,
        {
          provide: getModelToken(RecurringTemplate.name),
          useValue: mockRecurringModel,
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

  describe('instantiateForMonth', () => {
    it('should instantiate service and advance MSI from cuota 1/3 to cuota 2/3', async () => {
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

      const result = await service.instantiateForMonth(mockUserId, 2026, 9);

      expect(result.totalCount).toBe(2);
      expect(result.totalAmount).toBe(2150); // 650 + 1500

      const instantiatedMsi = result.items.find((i) => i.category === RecurringCategory.MSI);
      expect(instantiatedMsi?.title).toBe('PlayStation 5 (Cuota 1/3)');
      expect(instantiatedMsi?.isFinalInstallment).toBe(false);
      expect(msiItem.currentInstallment).toBe(2);
    });

    it('should complete MSI when instantiating final installment', async () => {
      const finalMsiItem = {
        ...mockMsiDoc,
        _id: new Types.ObjectId('222222222222222222222222'),
        title: 'PlayStation 5',
        category: RecurringCategory.MSI,
        amount: 1500,
        currentInstallment: 3,
        totalInstallments: 3,
        isCompleted: false,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockRecurringModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([finalMsiItem]),
      });

      const result = await service.instantiateForMonth(mockUserId, 2026, 9);

      expect(result.items[0].title).toBe('PlayStation 5 (Cuota 3/3)');
      expect(result.items[0].isFinalInstallment).toBe(true);
      expect(finalMsiItem.isCompleted).toBe(true);
      expect(finalMsiItem.isActive).toBe(false);
    });
  });
});
