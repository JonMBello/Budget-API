import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { WebPushService } from './services/web-push.service';
import { EmailService } from './services/email.service';
import { DueReminderScheduler } from './services/due-reminder-scheduler.service';
import { UsersService } from '../users/users.service';
import { TestNotificationChannel } from './dto/test-notification.dto';
import { SystemConfigService } from '../system-config/system-config.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockWebPushService: any;
  let mockEmailService: any;
  let mockDueReminderScheduler: any;
  let mockUsersService: any;
  let mockSystemConfigService: any;

  const mockUserId = '654321654321654321654321';

  beforeEach(async () => {
    mockWebPushService = {
      getPublicKey: jest.fn().mockReturnValue('test_public_key_123'),
      subscribe: jest.fn().mockResolvedValue({}),
      unsubscribe: jest.fn().mockResolvedValue({ success: true, message: 'Unsubscribed' }),
      sendTestPush: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
    };

    mockEmailService = {
      sendTestEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
    };

    mockDueReminderScheduler = {
      runManualCheck: jest.fn().mockResolvedValue({
        success: true,
        message: 'Processed',
        detectedUpcomingCount: 2,
        dispatchedAlertsCount: 2,
        logs: [],
      }),
    };

    mockUsersService = {
      findById: jest.fn().mockResolvedValue({
        _id: mockUserId,
        email: 'user@example.com',
        name: 'Juan',
      }),
    };

    mockSystemConfigService = {
      isNotificationsEnabled: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: WebPushService,
          useValue: mockWebPushService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: DueReminderScheduler,
          useValue: mockDueReminderScheduler,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: SystemConfigService,
          useValue: mockSystemConfigService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicKey', () => {
    it('should return VAPID public key', () => {
      const result = controller.getPublicKey();
      expect(result).toEqual({ publicKey: 'test_public_key_123' });
    });
  });

  describe('subscribe', () => {
    it('should register a web push subscription', async () => {
      const dto = {
        endpoint: 'https://push.service.com/sub/123',
        keys: { p256dh: 'p256', auth: 'auth' },
        device: 'MacBook Pro Chrome',
      };

      const result = await controller.subscribe(mockUserId, dto);

      expect(mockWebPushService.subscribe).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.success).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('should remove a web push subscription', async () => {
      const result = await controller.unsubscribe(mockUserId, {
        endpoint: 'https://push.service.com/sub/123',
      });

      expect(mockWebPushService.unsubscribe).toHaveBeenCalledWith(
        mockUserId,
        'https://push.service.com/sub/123',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('sendTest', () => {
    it('should dispatch test notifications for ALL channels', async () => {
      const result = await controller.sendTest(mockUserId, {
        channel: TestNotificationChannel.ALL,
      });

      expect(mockWebPushService.sendTestPush).toHaveBeenCalled();
      expect(mockEmailService.sendTestEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
        expect.any(String),
      );
      expect(result.success).toBe(true);
    });

    it('should NOT dispatch test notifications and should return success when notifications are disabled by system config', async () => {
      mockSystemConfigService.isNotificationsEnabled.mockResolvedValue(false);

      const result = await controller.sendTest(mockUserId, {
        channel: TestNotificationChannel.ALL,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Notifications are disabled by system config');
      expect(result.pushResult).toBeNull();
      expect(result.emailResult).toBeNull();
      expect(mockWebPushService.sendTestPush).not.toHaveBeenCalled();
      expect(mockEmailService.sendTestEmail).not.toHaveBeenCalled();
    });
  });

  describe('triggerReminders', () => {
    it('should run manual due reminder check', async () => {
      const result = await controller.triggerReminders(mockUserId);

      expect(mockDueReminderScheduler.runManualCheck).toHaveBeenCalledWith(mockUserId);
      expect(result.success).toBe(true);
      expect(result.detectedUpcomingCount).toBe(2);
    });
  });
});
