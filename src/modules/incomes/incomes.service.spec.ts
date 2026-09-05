import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { IncomesService } from './incomes.service';
import { Income, IncomeSource } from './schemas/income.schema';

describe('IncomesService', () => {
  let service: IncomesService;
  let mockIncomeModel: any;

  const mockUserId = '654321654321654321654321';
  const mockPeriodId = '654321654321654321654322';
  const mockIncomeId = '654321654321654321654323';

  const mockIncomeDoc: any = {
    _id: new Types.ObjectId(mockIncomeId),
    userId: new Types.ObjectId(mockUserId),
    periodId: new Types.ObjectId(mockPeriodId),
    title: 'Quincena Nomina',
    amount: 15000,
    date: new Date('2026-09-15'),
    source: IncomeSource.PAYROLL,
    isReceived: false,
    dueDate: new Date('2026-09-15'),
    debtorPersonId: null,
    linkedExpenseId: null,
    notes: 'Primer quincena',
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockIncomeModel = jest.fn().mockImplementation(() => mockIncomeDoc);
    mockIncomeModel.find = jest.fn();
    mockIncomeModel.findOne = jest.fn();
    mockIncomeModel.findByIdAndUpdate = jest.fn();
    mockIncomeModel.findByIdAndDelete = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomesService,
        {
          provide: getModelToken(Income.name),
          useValue: mockIncomeModel,
        },
      ],
    }).compile();

    service = module.get<IncomesService>(IncomesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a new income linked to user and period', async () => {
      mockIncomeDoc.save.mockResolvedValue(mockIncomeDoc);

      const result = await service.create(mockUserId, {
        periodId: mockPeriodId,
        title: 'Quincena Nomina',
        amount: 15000,
        date: '2026-09-15',
        source: IncomeSource.PAYROLL,
      });

      expect(result).toEqual(mockIncomeDoc);
      expect(mockIncomeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Quincena Nomina',
          amount: 15000,
          userId: expect.any(Types.ObjectId),
          periodId: expect.any(Types.ObjectId),
          isReceived: false,
        }),
      );
    });
  });

  describe('findAllByPeriod', () => {
    it('should query incomes filtered by userId and periodId when provided', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockIncomeDoc]),
      });
      mockIncomeModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAllByPeriod(mockUserId, mockPeriodId);

      expect(result).toEqual([mockIncomeDoc]);
      expect(mockIncomeModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        periodId: expect.any(Types.ObjectId),
      });
      expect(sortMock).toHaveBeenCalledWith({ date: -1, createdAt: -1 });
    });

    it('should query incomes filtered only by userId when periodId is not provided', async () => {
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockIncomeDoc]),
      });
      mockIncomeModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAllByPeriod(mockUserId);

      expect(result).toEqual([mockIncomeDoc]);
      expect(mockIncomeModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
      });
    });
  });

  describe('findOne', () => {
    it('should return income when found and owned by user', async () => {
      mockIncomeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockIncomeDoc),
      });

      const result = await service.findOne(mockUserId, mockIncomeId);

      expect(result).toEqual(mockIncomeDoc);
      expect(mockIncomeModel.findOne).toHaveBeenCalledWith({
        _id: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
      });
    });

    it('should throw NotFoundException if id is invalid', async () => {
      await expect(service.findOne(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if income is not found', async () => {
      mockIncomeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(mockUserId, mockIncomeId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update income fields correctly', async () => {
      mockIncomeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockIncomeDoc),
      });
      mockIncomeModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockIncomeDoc, title: 'Updated Title' }),
      });

      const result = await service.update(mockUserId, mockIncomeId, {
        title: 'Updated Title',
        debtorPersonId: '654321654321654321654324',
      });

      expect(result.title).toBe('Updated Title');
      expect(mockIncomeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockIncomeId,
        {
          $set: expect.objectContaining({
            title: 'Updated Title',
            debtorPersonId: expect.any(Types.ObjectId),
          }),
        },
        { new: true, runValidators: true },
      );
    });
  });

  describe('remove', () => {
    it('should delete income', async () => {
      mockIncomeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockIncomeDoc),
      });
      mockIncomeModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockIncomeDoc),
      });

      const result = await service.remove(mockUserId, mockIncomeId);

      expect(result).toEqual({
        success: true,
        message: 'Income deleted successfully',
      });
      expect(mockIncomeModel.findByIdAndDelete).toHaveBeenCalledWith(mockIncomeId);
    });
  });

  describe('markAsReceived', () => {
    it('should update isReceived to true', async () => {
      mockIncomeModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockIncomeDoc),
      });
      mockIncomeModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockIncomeDoc, isReceived: true }),
      });

      const result = await service.markAsReceived(mockUserId, mockIncomeId, true);

      expect(result.isReceived).toBe(true);
      expect(mockIncomeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockIncomeId,
        { $set: { isReceived: true } },
        { new: true },
      );
    });
  });

  describe('copyFromPreviousMonth', () => {
    it('should clone recurring incomes from source period excluding debt collections', async () => {
      const sourceIncomes = [
        {
          title: 'Nomina Base',
          amount: 20000,
          date: new Date('2026-08-15'),
          source: IncomeSource.PAYROLL,
          dueDate: new Date('2026-08-15'),
          debtorPersonId: null,
          notes: 'Quincenal',
        },
      ];

      mockIncomeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(sourceIncomes),
      });

      mockIncomeDoc.save.mockResolvedValue({
        ...sourceIncomes[0],
        _id: new Types.ObjectId(),
        periodId: new Types.ObjectId('654321654321654321654399'),
        isReceived: false,
      });

      const result = await service.copyFromPreviousMonth(mockUserId, {
        fromPeriodId: mockPeriodId,
        toPeriodId: '654321654321654321654399',
      });

      expect(mockIncomeModel.find).toHaveBeenCalledWith({
        userId: expect.any(Types.ObjectId),
        periodId: expect.any(Types.ObjectId),
        source: { $ne: IncomeSource.DEBT_COLLECTION },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('calculateTotalIncomeByPeriod', () => {
    it('should calculate total income sum for a given period', async () => {
      mockIncomeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ amount: 12000.5 }, { amount: 3500.25 }]),
      });

      const total = await service.calculateTotalIncomeByPeriod(mockUserId, mockPeriodId);

      expect(total).toBe(15500.75);
    });
  });
});
