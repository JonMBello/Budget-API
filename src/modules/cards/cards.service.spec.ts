import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CardsService } from './cards.service';
import { AccountCard } from './schemas/account-card.schema';
import { AccountCardType } from '../../common/utils/card-cycle.util';

describe('CardsService', () => {
  let service: CardsService;
  let mockCardModel: any;

  const mockUserId = '654321654321654321654321';
  const mockCardId = '111111111111111111111111';

  const mockCardDoc: any = {
    _id: new Types.ObjectId(mockCardId),
    userId: new Types.ObjectId(mockUserId),
    name: 'Banorte Platinum',
    type: AccountCardType.CREDIT,
    cutoffDay: 15,
    paymentDueDay: 5,
    color: '#1E88E5',
    last4Digits: '4321',
    creditLimit: 75000,
    isActive: true,
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockCardModel = jest.fn().mockImplementation(() => mockCardDoc);
    mockCardModel.find = jest.fn();
    mockCardModel.findOne = jest.fn();
    mockCardModel.findByIdAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        {
          provide: getModelToken(AccountCard.name),
          useValue: mockCardModel,
        },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new CREDIT card when cutoffDay and paymentDueDay are provided', async () => {
      mockCardDoc.save.mockResolvedValue(mockCardDoc);

      const result = await service.create(mockUserId, {
        name: 'Banorte Platinum',
        type: AccountCardType.CREDIT,
        cutoffDay: 15,
        paymentDueDay: 5,
      });

      expect(result).toEqual(mockCardDoc);
      expect(mockCardModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Banorte Platinum',
          type: AccountCardType.CREDIT,
          cutoffDay: 15,
          paymentDueDay: 5,
          userId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should throw BadRequestException if type is CREDIT but cutoffDay is missing', async () => {
      await expect(
        service.create(mockUserId, {
          name: 'Banorte Platinum',
          type: AccountCardType.CREDIT,
          paymentDueDay: 5,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if type is CREDIT but paymentDueDay is missing', async () => {
      await expect(
        service.create(mockUserId, {
          name: 'Banorte Platinum',
          type: AccountCardType.CREDIT,
          cutoffDay: 15,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a DEBIT account without cutoffDay or paymentDueDay', async () => {
      const debitDoc = {
        ...mockCardDoc,
        type: AccountCardType.DEBIT,
        cutoffDay: null,
        paymentDueDay: null,
      };
      mockCardDoc.save.mockResolvedValue(debitDoc);

      const result = await service.create(mockUserId, {
        name: 'BBVA Débito',
        type: AccountCardType.DEBIT,
      });

      expect(result.type).toBe(AccountCardType.DEBIT);
    });
  });

  describe('findAllByUser', () => {
    it('should return active cards sorted by createdAt by default', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockCardDoc]),
      });
      mockCardModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAllByUser(mockUserId);

      expect(result).toHaveLength(1);
      expect(mockCardModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        isActive: true,
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should include inactive cards when includeInactive is true', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockCardDoc]),
      });
      mockCardModel.find.mockReturnValue({ sort: sortMock });

      await service.findAllByUser(mockUserId, true);

      expect(mockCardModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
      });
    });
  });

  describe('findOne', () => {
    it('should return card when card exists and belongs to the user', async () => {
      mockCardModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCardDoc),
      });

      const result = await service.findOne(mockUserId, mockCardId);
      expect(result).toEqual(mockCardDoc);
      expect(mockCardModel.findOne).toHaveBeenCalledWith({
        _id: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
      });
    });

    it('should throw NotFoundException if cardId is not a valid ObjectId', async () => {
      await expect(service.findOne(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if card is not found or belongs to another user', async () => {
      mockCardModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(mockUserId, mockCardId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update card fields successfully', async () => {
      mockCardModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCardDoc),
      });
      mockCardModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockCardDoc,
          name: 'Updated Card Name',
        }),
      });

      const result = await service.update(mockUserId, mockCardId, {
        name: 'Updated Card Name',
      });

      expect(result.name).toBe('Updated Card Name');
    });

    it('should throw BadRequestException if update leaves a CREDIT card without cutoffDay', async () => {
      mockCardModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCardDoc),
      });

      await expect(
        service.update(mockUserId, mockCardId, {
          cutoffDay: null as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should perform soft delete by setting isActive to false', async () => {
      mockCardModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCardDoc),
      });
      mockCardModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockCardDoc, isActive: false }),
      });

      const result = await service.remove(mockUserId, mockCardId);
      expect(result).toEqual({
        success: true,
        message: 'Card or account deactivated successfully',
      });
      expect(mockCardModel.findByIdAndUpdate).toHaveBeenCalledWith(mockCardId, {
        $set: { isActive: false },
      });
    });
  });

  describe('previewStatement', () => {
    it('should preview statement cycle calculations for credit card', async () => {
      mockCardModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCardDoc),
      });

      const preview = await service.previewStatement(mockUserId, mockCardId, '2026-09-10');

      expect(preview.cutoffDate).toBe('2026-09-15');
      expect(preview.paymentDueDate).toBe('2026-10-05');
      expect(preview.impactBudgetYear).toBe(2026);
      expect(preview.impactBudgetMonth).toBe(10);
      expect(preview.impactBudgetPeriod).toBe('2026-10');
      expect(preview.daysUntilDue).toBe(25);
    });
  });
});
