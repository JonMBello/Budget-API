import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PeopleService } from './people.service';
import { Person } from './schemas/person.schema';
import { RecurringService } from '../recurring/recurring.service';
import { ExpensesService } from '../expenses/expenses.service';

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

  let mockRecurringService: any;
  let mockExpensesService: any;

  beforeEach(async () => {
    mockPersonModel = jest.fn().mockImplementation(() => mockPersonDoc);
    mockPersonModel.find = jest.fn();
    mockPersonModel.findOne = jest.fn();
    mockPersonModel.findByIdAndUpdate = jest.fn();

    mockRecurringService = {
      findActiveDebtsByPerson: jest.fn().mockResolvedValue([]),
    };

    mockExpensesService = {
      findPendingDebtsByPerson: jest.fn().mockResolvedValue([]),
      markSplitAsPaid: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        {
          provide: getModelToken(Person.name),
          useValue: mockPersonModel,
        },
        {
          provide: RecurringService,
          useValue: mockRecurringService,
        },
        {
          provide: ExpensesService,
          useValue: mockExpensesService,
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

    it('should aggregate active MSI plans and recurring services for the person', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const mockMsi = {
        _id: new Types.ObjectId('222222222222222222222222'),
        title: 'PS5 (MSI)',
        category: 'MSI',
        currentInstallment: 2,
        totalInstallments: 6,
        amount: 1500,
        split: { splitAmount: 750 },
      };

      const mockService = {
        _id: new Types.ObjectId('333333333333333333333333'),
        title: 'Netflix',
        category: 'SUBSCRIPTION',
        amount: 200,
        split: { splitAmount: 100 },
      };

      mockRecurringService.findActiveDebtsByPerson.mockResolvedValue([mockMsi, mockService]);

      const summary = await service.getDebtsSummary(mockUserId, mockPersonId);

      // MSI remaining: (6 - 2 + 1) = 5 installments * 750 = 3750
      // Service amount: 100
      // Total debt: 3750 + 100 = 3850
      // Immediate due: 750 + 100 = 850
      expect(summary.totalDebt).toBe(3850);
      expect(summary.immediateDueAmount).toBe(850);
      expect(summary.msiInstallments).toHaveLength(1);
      expect(summary.recurringServices).toHaveLength(1);
    });

    it('should aggregate pending single expenses and compute nextPaymentDueDate', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const mockExpense = {
        _id: new Types.ObjectId('444444444444444444444444'),
        title: 'Friday Dinner',
        amount: 800,
        date: new Date('2026-09-02'),
        paymentDueDate: new Date('2026-10-05'),
        cardId: { name: 'BBVA Platinum' },
        split: {
          splitAmount: 400,
          isDebtActive: true,
        },
      };

      mockExpensesService.findPendingDebtsByPerson.mockResolvedValue([mockExpense]);

      const summary = await service.getDebtsSummary(mockUserId, mockPersonId);

      expect(summary.totalDebt).toBe(400);
      expect(summary.immediateDueAmount).toBe(400);
      expect(summary.nextPaymentDueDate).toBe('2026-10-05');
      expect(summary.singleExpenses).toHaveLength(1);
      expect(summary.singleExpenses[0]).toEqual({
        id: '444444444444444444444444',
        title: 'Friday Dinner',
        cardName: 'BBVA Platinum',
        amount: 400,
        date: '2026-09-02',
        paymentDueDate: '2026-10-05',
        isPaid: false,
      });
    });
  });

  describe('getDebtsSummaryV2', () => {
    it('should return empty periods and $0 totalDebt when person has no debts', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });
      mockExpensesService.findPendingDebtsByPerson.mockResolvedValue([]);
      mockRecurringService.findActiveDebtsByPerson.mockResolvedValue([]);

      const result = await service.getDebtsSummaryV2(mockUserId, mockPersonId);

      expect(result).toEqual({
        personId: mockPersonId,
        name: 'Juan Pérez',
        phoneCode: '+52',
        phone: '8181234567',
        email: 'juan.perez@example.com',
        totalDebt: 0,
        periods: [],
      });
    });

    it('should separate pending debts from September and October into distinct periods with their own breakdown', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const septPeriodId = '555555555555555555555551';
      const octPeriodId = '555555555555555555555552';

      const septExpense = {
        _id: new Types.ObjectId('444444444444444444444441'),
        title: 'Septiembre Dinner',
        amount: 600,
        category: 'FOOD',
        date: '2026-09-15',
        paymentDueDate: '2026-10-05',
        cardId: { name: 'BBVA Platinum' },
        periodId: new Types.ObjectId(septPeriodId),
        split: { splitAmount: 300, isDebtActive: true },
      };

      const octExpense = {
        _id: new Types.ObjectId('444444444444444444444442'),
        title: 'Octubre Concert Ticket',
        amount: 1000,
        category: 'ENTERTAINMENT',
        date: '2026-10-12',
        paymentDueDate: '2026-11-05',
        cardId: { name: 'Santander LikeU' },
        periodId: new Types.ObjectId(octPeriodId),
        split: { splitAmount: 500, isDebtActive: true },
      };

      mockExpensesService.findPendingDebtsByPerson.mockResolvedValue([septExpense, octExpense]);
      mockRecurringService.findActiveDebtsByPerson.mockResolvedValue([]);

      const result = await service.getDebtsSummaryV2(mockUserId, mockPersonId);

      expect(result.totalDebt).toBe(800);
      expect(result.periods).toHaveLength(2);

      expect(result.periods[0]).toEqual({
        period: '2026-09',
        year: 2026,
        month: 9,
        periodName: 'Septiembre 2026',
        periodId: septPeriodId,
        totalDebt: 300,
        msiInstallments: [],
        recurringServices: [],
        singleExpenses: [
          {
            id: '444444444444444444444441',
            title: 'Septiembre Dinner',
            cardName: 'BBVA Platinum',
            amount: 300,
            date: '2026-09-15',
            paymentDueDate: '2026-10-05',
            isPaid: false,
          },
        ],
      });

      expect(result.periods[1]).toEqual({
        period: '2026-10',
        year: 2026,
        month: 10,
        periodName: 'Octubre 2026',
        periodId: octPeriodId,
        totalDebt: 500,
        msiInstallments: [],
        recurringServices: [],
        singleExpenses: [
          {
            id: '444444444444444444444442',
            title: 'Octubre Concert Ticket',
            cardName: 'Santander LikeU',
            amount: 500,
            date: '2026-10-12',
            paymentDueDate: '2026-11-05',
            isPaid: false,
          },
        ],
      });
    });

    it('should project future MSI installments informatively without duplicating already instantiated cuotas', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const msiTemplateId = '222222222222222222222222';

      // September already has an instantiated expense for Cuota 1
      const septMsiExpense = {
        _id: new Types.ObjectId('444444444444444444444443'),
        templateId: new Types.ObjectId(msiTemplateId),
        title: 'MacBook Air M2 (Cuota 1/3)',
        category: 'MSI',
        amount: 3000,
        date: '2026-09-01',
        paymentDueDate: '2026-10-05',
        cardId: { name: 'BBVA Platinum' },
        periodId: new Types.ObjectId('555555555555555555555551'),
        split: { splitAmount: 1500, isDebtActive: true },
      };

      // Template is on installment 2 of 3, last instantiated in 2026-09
      const msiTemplate = {
        _id: new Types.ObjectId(msiTemplateId),
        title: 'MacBook Air M2',
        category: 'MSI',
        currentInstallment: 2,
        totalInstallments: 3,
        amount: 3000,
        lastInstantiatedYear: 2026,
        lastInstantiatedMonth: 9,
        split: { splitAmount: 1500 },
      };

      mockExpensesService.findPendingDebtsByPerson.mockResolvedValue([septMsiExpense]);
      mockRecurringService.findActiveDebtsByPerson.mockResolvedValue([msiTemplate]);

      const result = await service.getDebtsSummaryV2(mockUserId, mockPersonId);

      // Sept has instantiated cuota 1 ($1500)
      // Oct projects cuota 2 ($1500)
      // Nov projects cuota 3 ($1500)
      // Total debt = 4500
      expect(result.totalDebt).toBe(4500);
      expect(result.periods).toHaveLength(3);

      expect(result.periods[0].period).toBe('2026-09');
      expect(result.periods[0].totalDebt).toBe(1500);
      expect(result.periods[0].msiInstallments).toHaveLength(1);
      expect(result.periods[0].msiInstallments[0].currentInstallment).toBe(1);

      expect(result.periods[1].period).toBe('2026-10');
      expect(result.periods[1].totalDebt).toBe(1500);
      expect(result.periods[1].msiInstallments).toHaveLength(1);
      expect(result.periods[1].msiInstallments[0].currentInstallment).toBe(2);
      expect(result.periods[1].periodId).toBeNull(); // informative projection

      expect(result.periods[2].period).toBe('2026-11');
      expect(result.periods[2].totalDebt).toBe(1500);
      expect(result.periods[2].msiInstallments).toHaveLength(1);
      expect(result.periods[2].msiInstallments[0].currentInstallment).toBe(3);
    });

    it('should throw NotFoundException if personId is invalid or person not found', async () => {
      await expect(service.getDebtsSummaryV2(mockUserId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
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

    it('should mark expense split as paid if expenseId is provided', async () => {
      mockPersonModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPersonDoc),
      });

      const expenseId = '444444444444444444444444';
      mockExpensesService.markSplitAsPaid.mockResolvedValue({
        _id: new Types.ObjectId(expenseId),
        split: { splitAmount: 250 },
      });

      const result = await service.settleDebt(mockUserId, mockPersonId, {
        expenseId,
      });

      expect(mockExpensesService.markSplitAsPaid).toHaveBeenCalledWith(mockUserId, expenseId);
      expect(result.amount).toBe(250);
      expect(result.success).toBe(true);
    });
  });
});
