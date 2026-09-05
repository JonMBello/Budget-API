import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PeopleService } from './people.service';
import { Person } from './schemas/person.schema';

describe('PeopleService', () => {
  let service: PeopleService;
  let mockPersonModel: any;

  const mockUserId = '654321654321654321654321';
  const mockPersonId = '111111111111111111111111';

  const mockPersonDoc: any = {
    _id: new Types.ObjectId(mockPersonId),
    userId: new Types.ObjectId(mockUserId),
    name: 'Juan Pérez',
    phoneCode: '+52',
    phone: '8181234567',
    email: 'juan.perez@example.com',
    notes: 'Coworker sharing subscriptions',
    isActive: true,
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockPersonModel = jest.fn().mockImplementation(() => mockPersonDoc);
    mockPersonModel.find = jest.fn();
    mockPersonModel.findOne = jest.fn();
    mockPersonModel.findByIdAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        {
          provide: getModelToken(Person.name),
          useValue: mockPersonModel,
        },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new person linked to userId', async () => {
      mockPersonDoc.save.mockResolvedValue(mockPersonDoc);

      const result = await service.create(mockUserId, {
        name: 'Juan Pérez',
        phoneCode: '+52',
        phone: '8181234567',
        email: 'juan.perez@example.com',
        notes: 'Coworker sharing subscriptions',
      });

      expect(result).toEqual(mockPersonDoc);
      expect(mockPersonModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Juan Pérez',
          phoneCode: '+52',
          phone: '8181234567',
          email: 'juan.perez@example.com',
          userId: expect.any(Types.ObjectId),
        }),
      );
    });
  });

  describe('findAllByUser', () => {
    it('should return active people sorted by name by default', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockPersonDoc]),
      });
      mockPersonModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAllByUser(mockUserId);

      expect(result).toHaveLength(1);
      expect(mockPersonModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        isActive: true,
      });
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
    });

    it('should include inactive people when includeInactive is true', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockPersonDoc]),
      });
      mockPersonModel.find.mockReturnValue({ sort: sortMock });

      await service.findAllByUser(mockUserId, true);

      expect(mockPersonModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
      });
    });
  });

  describe('findOne', () => {
    it('should return person when it exists and belongs to the user', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const result = await service.findOne(mockUserId, mockPersonId);
      expect(result).toEqual(mockPersonDoc);
      expect(mockPersonModel.findOne).toHaveBeenCalledWith({
        _id: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
      });
    });

    it('should throw NotFoundException if personId is not a valid ObjectId', async () => {
      await expect(service.findOne(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if person is not found or belongs to another user', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(mockUserId, mockPersonId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update person fields successfully', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });
      mockPersonModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPersonDoc,
          name: 'Juan Carlos Pérez',
        }),
      });

      const result = await service.update(mockUserId, mockPersonId, {
        name: 'Juan Carlos Pérez',
      });

      expect(result.name).toBe('Juan Carlos Pérez');
      expect(mockPersonModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockPersonId,
        { $set: { name: 'Juan Carlos Pérez' } },
        { new: true, runValidators: true },
      );
    });
  });

  describe('remove', () => {
    it('should perform soft delete by setting isActive to false', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });
      mockPersonModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPersonDoc, isActive: false }),
      });

      const result = await service.remove(mockUserId, mockPersonId);
      expect(result).toEqual({
        success: true,
        message: 'Person deactivated successfully',
      });
      expect(mockPersonModel.findByIdAndUpdate).toHaveBeenCalledWith(mockPersonId, {
        $set: { isActive: false },
      });
    });
  });

  describe('getDebtsSummary', () => {
    it('should return initial empty debt summary with $0 total for an existing person', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const summary = await service.getDebtsSummary(mockUserId, mockPersonId);

      expect(summary).toEqual({
        personId: mockPersonId,
        name: 'Juan Pérez',
        phoneCode: '+52',
        phone: '8181234567',
        email: 'juan.perez@example.com',
        totalDebt: 0,
        immediateDueAmount: 0,
        nextPaymentDueDate: null,
        msiInstallments: [],
        recurringServices: [],
        singleExpenses: [],
      });
    });
  });

  describe('settleDebt', () => {
    it('should return a settlement confirmation for an existing person', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const result = await service.settleDebt(mockUserId, mockPersonId, {
        amount: 350.5,
        notes: 'SPEI transfer received',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Debt settled successfully');
      expect(result.personId).toBe(mockPersonId);
      expect(result.amount).toBe(350.5);
      expect(result.settledAt).toBeInstanceOf(Date);
    });
  });
});
