import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DueReminderScheduler } from './due-reminder-scheduler.service';
import { User } from '../../users/schemas/user.schema';
import { AccountCard } from '../../cards/schemas/account-card.schema';
import { Expense } from '../../expenses/schemas/expense.schema';
import { Income } from '../../incomes/schemas/income.schema';
import { NotificationLog } from '../schemas/notification-log.schema';
import { WebPushService } from './web-push.service';
import { EmailService } from './email.service';
import { AccountCardType } from '../../../common/utils/card-cycle.util';

describe('DueReminderScheduler', () => {
  let scheduler: DueReminderScheduler;
  let mockUserModel: any;
  let mockCardModel: any;
  let mockExpenseModel: any;
  let mockIncomeModel: any;
  let mockLogModel: any;
  let mockWebPushService: any;
  let mockEmailService: any;

  const mockUserId = '654321654321654321654321';
  const mockCardId = '654321654321654321654322';
  const mockExpenseId = '654321654321654321654323';
  const mockIncomeId = '654321654321654321654324';

  const mockUserDoc: any = {
    _id: new Types.ObjectId(mockUserId),
    name: 'Juan Pérez',
    email: 'juan@example.com',
    isActive: true,
  };

  beforeEach(async () => {
    mockUserModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockUserDoc]),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserDoc),
      }),
    };

    mockCardModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockExpenseModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockIncomeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockLogModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
    }));
    mockLogModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockWebPushService = {
      sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
    };

    mockEmailService = {
      sendDueReminderEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DueReminderScheduler,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(AccountCard.name),
          useValue: mockCardModel,
        },
        {
          provide: getModelToken(Expense.name),
          useValue: mockExpenseModel,
        },
        {
          provide: getModelToken(Income.name),
          useValue: mockIncomeModel,
        },
        {
          provide: getModelToken(NotificationLog.name),
          useValue: mockLogModel,
        },
        {
          provide: WebPushService,
          useValue: mockWebPushService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    scheduler = module.get<DueReminderScheduler>(DueReminderScheduler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectUpcomingDues', () => {
    it('should detect credit cards with paymentDueDay within the next 3 days', async () => {
      const now = new Date();
      // Target due day 2 days from now
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getDate();

      mockCardModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(mockCardId),
            name: 'BBVA Platinum',
            type: AccountCardType.CREDIT,
            paymentDueDay: targetDay,
          },
        ]),
      });

      const dues = await scheduler.detectUpcomingDues(mockUserId);

      expect(dues).toHaveLength(1);
      expect(dues[0].title).toBe('Tarjeta BBVA Platinum');
      expect(dues[0].targetId).toBe(mockCardId);
      expect(dues[0].itemType).toBe('CARD');
    });

    it('should detect unpaid services with paymentDueDate within 3 days', async () => {
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      mockExpenseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(mockExpenseId),
            title: 'Internet Izzi',
            amount: 700,
            paymentDueDate: dueDate,
          },
        ]),
      });

      const dues = await scheduler.detectUpcomingDues(mockUserId);

      expect(dues).toHaveLength(1);
      expect(dues[0].title).toBe('Internet Izzi');
      expect(dues[0].amount).toBe(700);
      expect(dues[0].itemType).toBe('SERVICE');
    });

    it('should detect unreceived debt collections with dueDate within 3 days', async () => {
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

      mockIncomeModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(mockIncomeId),
            title: 'Cobro a Carlos: Cena',
            amount: 450,
            dueDate: dueDate,
          },
        ]),
      });

      const dues = await scheduler.detectUpcomingDues(mockUserId);

      expect(dues).toHaveLength(1);
      expect(dues[0].title).toBe('Cobro a Carlos: Cena');
      expect(dues[0].amount).toBe(450);
      expect(dues[0].itemType).toBe('DEBT_COLLECTION');
    });
  });

  describe('Deduplication Prevention via NotificationLog', () => {
    it('should NOT dispatch alerts if item was already notified today', async () => {
      const now = new Date();
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDate();

      mockCardModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(mockCardId),
            name: 'BBVA Platinum',
            type: AccountCardType.CREDIT,
            paymentDueDay: targetDay,
          },
        ]),
      });

      // NotificationLog returns existing log for today
      mockLogModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), status: 'SENT' }),
      });

      const result = await scheduler.runManualCheck(mockUserId);

      expect(result.detectedUpcomingCount).toBe(1);
      expect(result.dispatchedAlertsCount).toBe(0);
      expect(mockWebPushService.sendPushToUser).not.toHaveBeenCalled();
      expect(mockEmailService.sendDueReminderEmail).not.toHaveBeenCalled();
    });

    it('should dispatch Web Push and Email and record logs when new upcoming items are detected', async () => {
      const now = new Date();
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDate();

      mockCardModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(mockCardId),
            name: 'BBVA Platinum',
            type: AccountCardType.CREDIT,
            paymentDueDay: targetDay,
          },
        ]),
      });

      // No log found for today
      mockLogModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await scheduler.runManualCheck(mockUserId);

      expect(result.detectedUpcomingCount).toBe(1);
      expect(result.dispatchedAlertsCount).toBe(1);
      expect(mockWebPushService.sendPushToUser).toHaveBeenCalled();
      expect(mockEmailService.sendDueReminderEmail).toHaveBeenCalled();
      expect(mockLogModel).toHaveBeenCalled();
    });
  });

  describe('handleDailyReminders', () => {
    it('should execute daily cron check for all active users', async () => {
      await scheduler.handleDailyReminders();
      expect(mockUserModel.find).toHaveBeenCalledWith({ isActive: true });
    });
  });
});
