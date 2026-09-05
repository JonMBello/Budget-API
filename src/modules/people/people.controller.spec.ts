import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

describe('PeopleController', () => {
  let controller: PeopleController;
  let service: PeopleService;

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
    createdAt: new Date('2026-09-04T00:00:00.000Z'),
    updatedAt: new Date('2026-09-04T00:00:00.000Z'),
  };

  const mockPeopleService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getDebtsSummary: jest.fn(),
    settleDebt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeopleController],
      providers: [
        {
          provide: PeopleService,
          useValue: mockPeopleService,
        },
      ],
    }).compile();

    controller = module.get<PeopleController>(PeopleController);
    service = module.get<PeopleService>(PeopleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call peopleService.create and return mapped response', async () => {
      mockPeopleService.create.mockResolvedValue(mockPersonDoc);

      const result = await controller.create(mockUserId, {
        name: 'Juan Pérez',
        phoneCode: '+52',
        phone: '8181234567',
        email: 'juan.perez@example.com',
      });

      expect(result).toEqual({
        id: mockPersonId,
        name: 'Juan Pérez',
        phoneCode: '+52',
        phone: '8181234567',
        email: 'juan.perez@example.com',
        notes: 'Coworker sharing subscriptions',
        isActive: true,
        createdAt: mockPersonDoc.createdAt,
        updatedAt: mockPersonDoc.updatedAt,
      });
      expect(service.create).toHaveBeenCalledWith(mockUserId, {
        name: 'Juan Pérez',
        phoneCode: '+52',
        phone: '8181234567',
        email: 'juan.perez@example.com',
      });
    });
  });

  describe('findAll', () => {
    it('should call peopleService.findAllByUser with includeInactive flag', async () => {
      mockPeopleService.findAllByUser.mockResolvedValue([mockPersonDoc]);

      const result = await controller.findAll(mockUserId, 'true');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockPersonId);
      expect(service.findAllByUser).toHaveBeenCalledWith(mockUserId, true);
    });
  });

  describe('findOne', () => {
    it('should return person details by ID', async () => {
      mockPeopleService.findOne.mockResolvedValue(mockPersonDoc);

      const result = await controller.findOne(mockUserId, mockPersonId);

      expect(result.id).toBe(mockPersonId);
      expect(service.findOne).toHaveBeenCalledWith(mockUserId, mockPersonId);
    });
  });

  describe('update', () => {
    it('should update person and return response', async () => {
      const updatedDoc = { ...mockPersonDoc, name: 'Juan C. Pérez' };
      mockPeopleService.update.mockResolvedValue(updatedDoc);

      const result = await controller.update(mockUserId, mockPersonId, {
        name: 'Juan C. Pérez',
      });

      expect(result.name).toBe('Juan C. Pérez');
      expect(service.update).toHaveBeenCalledWith(mockUserId, mockPersonId, {
        name: 'Juan C. Pérez',
      });
    });
  });

  describe('remove', () => {
    it('should soft delete person', async () => {
      mockPeopleService.remove.mockResolvedValue({
        success: true,
        message: 'Person deactivated successfully',
      });

      const result = await controller.remove(mockUserId, mockPersonId);

      expect(result.success).toBe(true);
      expect(service.remove).toHaveBeenCalledWith(mockUserId, mockPersonId);
    });
  });

  describe('getDebtsSummary', () => {
    it('should return debt summary from service', async () => {
      const mockSummary = {
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
      };
      mockPeopleService.getDebtsSummary.mockResolvedValue(mockSummary);

      const result = await controller.getDebtsSummary(mockUserId, mockPersonId);

      expect(result).toEqual(mockSummary);
      expect(service.getDebtsSummary).toHaveBeenCalledWith(mockUserId, mockPersonId);
    });
  });

  describe('settleDebt', () => {
    it('should call settleDebt and return result', async () => {
      const mockSettlement = {
        success: true,
        message: 'Debt settled successfully',
        personId: mockPersonId,
        amount: 500,
        settledAt: new Date(),
      };
      mockPeopleService.settleDebt.mockResolvedValue(mockSettlement);

      const result = await controller.settleDebt(mockUserId, mockPersonId, { amount: 500 });

      expect(result.success).toBe(true);
      expect(result.amount).toBe(500);
      expect(service.settleDebt).toHaveBeenCalledWith(mockUserId, mockPersonId, { amount: 500 });
    });
  });
});
