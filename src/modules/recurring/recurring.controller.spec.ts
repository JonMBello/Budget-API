import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';
import { RecurringCategory, SplitType } from './schemas/recurring-template.schema';
import { Currency } from '../users/schemas/user.schema';

describe('RecurringController', () => {
  let controller: RecurringController;
  let service: RecurringService;

  const mockUserId = '654321654321654321654321';
  const mockTemplateId = '111111111111111111111111';
  const mockCardId = '222222222222222222222222';
  const mockPersonId = '333333333333333333333333';

  const mockTemplateDoc: any = {
    _id: new Types.ObjectId(mockTemplateId),
    userId: new Types.ObjectId(mockUserId),
    title: 'Netflix 4K',
    category: RecurringCategory.SUBSCRIPTION,
    cardId: new Types.ObjectId(mockCardId),
    amount: 219,
    currency: Currency.MXN,
    exchangeRate: 1.0,
    totalAmount: null,
    totalInstallments: null,
    currentInstallment: null,
    startDate: '2026-09-01',
    split: {
      personId: new Types.ObjectId(mockPersonId),
      splitType: SplitType.PERCENTAGE,
      splitValue: 50,
      splitAmount: 109.5,
    },
    isActive: true,
    isCompleted: false,
    notes: 'Family account',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  const mockRecurringService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    instantiateForPeriod: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    advanceMsi: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringController],
      providers: [
        {
          provide: RecurringService,
          useValue: mockRecurringService,
        },
      ],
    }).compile();

    controller = module.get<RecurringController>(RecurringController);
    service = module.get<RecurringService>(RecurringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create recurring template and return response DTO', async () => {
      mockRecurringService.create.mockResolvedValue(mockTemplateDoc);

      const result = await controller.create(mockUserId, {
        title: 'Netflix 4K',
        category: RecurringCategory.SUBSCRIPTION,
        amount: 219,
      });

      expect(result.id).toBe(mockTemplateId);
      expect(result.title).toBe('Netflix 4K');
      expect(result.split?.splitAmount).toBe(109.5);
      expect(service.create).toHaveBeenCalledWith(mockUserId, {
        title: 'Netflix 4K',
        category: RecurringCategory.SUBSCRIPTION,
        amount: 219,
      });
    });
  });

  describe('findAll', () => {
    it('should return list of recurring templates', async () => {
      mockRecurringService.findAllByUser.mockResolvedValue([mockTemplateDoc]);

      const result = await controller.findAll(mockUserId, 'true', RecurringCategory.SUBSCRIPTION);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockTemplateId);
      expect(service.findAllByUser).toHaveBeenCalledWith(
        mockUserId,
        true,
        RecurringCategory.SUBSCRIPTION,
      );
    });
  });

  describe('instantiate', () => {
    it('should call service.instantiateForPeriod and return results', async () => {
      const mockResult = {
        periodId: '654321654321654321654320',
        year: 2026,
        month: 9,
        createdCount: 3,
        skippedCount: 1,
      };
      mockRecurringService.instantiateForPeriod.mockResolvedValue(mockResult);

      const result = await controller.instantiate(mockUserId, {
        periodId: '654321654321654321654320',
      });

      expect(result).toEqual(mockResult);
      expect(service.instantiateForPeriod).toHaveBeenCalledWith(
        mockUserId,
        '654321654321654321654320',
      );
    });
  });

  describe('findOne', () => {
    it('should return template by ID', async () => {
      mockRecurringService.findOne.mockResolvedValue(mockTemplateDoc);

      const result = await controller.findOne(mockUserId, mockTemplateId);

      expect(result.id).toBe(mockTemplateId);
      expect(service.findOne).toHaveBeenCalledWith(mockUserId, mockTemplateId);
    });
  });

  describe('update', () => {
    it('should update template and return updated response DTO', async () => {
      const updatedDoc = { ...mockTemplateDoc, title: 'Netflix Ultra' };
      mockRecurringService.update.mockResolvedValue(updatedDoc);

      const result = await controller.update(mockUserId, mockTemplateId, {
        title: 'Netflix Ultra',
      });

      expect(result.title).toBe('Netflix Ultra');
      expect(service.update).toHaveBeenCalledWith(mockUserId, mockTemplateId, {
        title: 'Netflix Ultra',
      });
    });
  });

  describe('remove', () => {
    it('should soft delete template', async () => {
      mockRecurringService.remove.mockResolvedValue({
        success: true,
        message: 'Recurring template deactivated successfully',
      });

      const result = await controller.remove(mockUserId, mockTemplateId);

      expect(result.success).toBe(true);
      expect(service.remove).toHaveBeenCalledWith(mockUserId, mockTemplateId);
    });
  });

  describe('advanceMsi', () => {
    it('should call service.advanceMsi and return updated plan', async () => {
      const advancedDoc = { ...mockTemplateDoc, currentInstallment: 3 };
      mockRecurringService.advanceMsi.mockResolvedValue(advancedDoc);

      const result = await controller.advanceMsi(mockUserId, mockTemplateId, {
        installmentsCount: 2,
      });

      expect(result.currentInstallment).toBe(3);
      expect(service.advanceMsi).toHaveBeenCalledWith(mockUserId, mockTemplateId, {
        installmentsCount: 2,
      });
    });
  });

  describe('cancel', () => {
    it('should cancel template immediately', async () => {
      const cancelledDoc = { ...mockTemplateDoc, isActive: false };
      mockRecurringService.cancel.mockResolvedValue(cancelledDoc);

      const result = await controller.cancel(mockUserId, mockTemplateId);

      expect(result.isActive).toBe(false);
      expect(service.cancel).toHaveBeenCalledWith(mockUserId, mockTemplateId);
    });
  });
});
