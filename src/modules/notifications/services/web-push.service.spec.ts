import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as webpush from 'web-push';
import { WebPushService } from './web-push.service';
import { WebPushSubscription } from '../schemas/web-push-subscription.schema';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  generateVAPIDKeys: jest.fn().mockReturnValue({
    publicKey: 'mock_generated_public_key',
    privateKey: 'mock_generated_private_key',
  }),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}));

describe('WebPushService', () => {
  let service: WebPushService;
  let mockSubscriptionModel: any;

  const mockUserId = '654321654321654321654321';
  const mockEndpoint = 'https://fcm.googleapis.com/fcm/send/c_123';
  const mockKeys = { p256dh: 'mockP256', auth: 'mockAuth' };

  beforeEach(async () => {
    mockSubscriptionModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: new Types.ObjectId(mockUserId),
          endpoint: mockEndpoint,
          keys: mockKeys,
          isActive: true,
        }),
      }),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(),
            endpoint: mockEndpoint,
            keys: mockKeys,
            isActive: true,
          },
        ]),
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebPushService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BUDGET_API_VAPID_PUBLIC_KEY') return 'test_public_key';
              if (key === 'BUDGET_API_VAPID_PRIVATE_KEY') return 'test_private_key';
              if (key === 'BUDGET_API_VAPID_SUBJECT') return 'mailto:test@budget.com';
              return null;
            }),
          },
        },
        {
          provide: getModelToken(WebPushSubscription.name),
          useValue: mockSubscriptionModel,
        },
      ],
    }).compile();

    service = module.get<WebPushService>(WebPushService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicKey', () => {
    it('should return VAPID public key', () => {
      const key = service.getPublicKey();
      expect(key).toBe('test_public_key');
    });
  });

  describe('subscribe', () => {
    it('should upsert subscription record for user and endpoint', async () => {
      const result = await service.subscribe(mockUserId, {
        endpoint: mockEndpoint,
        keys: mockKeys,
        device: 'iPhone 15 Safari',
      });

      expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          userId: expect.any(Types.ObjectId),
          endpoint: mockEndpoint,
        },
        {
          $set: expect.objectContaining({
            endpoint: mockEndpoint,
            keys: mockKeys,
            device: 'iPhone 15 Safari',
            isActive: true,
          }),
        },
        { new: true, upsert: true, runValidators: true },
      );
      expect(result).toBeDefined();
    });
  });

  describe('unsubscribe', () => {
    it('should set subscription isActive to false', async () => {
      const result = await service.unsubscribe(mockUserId, mockEndpoint);

      expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          userId: expect.any(Types.ObjectId),
          endpoint: mockEndpoint,
        },
        { $set: { isActive: false } },
      );
      expect(result.success).toBe(true);
    });
  });

  describe('sendPushToUser', () => {
    it('should dispatch push notifications to active subscriptions', async () => {
      const result = await service.sendPushToUser(mockUserId, {
        title: 'Upcoming Due',
        body: 'Your card BBVA is due in 3 days',
      });

      expect(webpush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: mockEndpoint,
          keys: mockKeys,
        },
        expect.stringContaining('Upcoming Due'),
      );
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should deactivate subscriptions that return 410 Gone', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValueOnce({
        statusCode: 410,
        message: 'Subscription has expired or is no longer valid',
      });

      const result = await service.sendPushToUser(mockUserId, {
        title: 'Alert',
        body: 'Test',
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        { $set: { isActive: false } },
      );
    });
  });

  describe('sendTestPush', () => {
    it('should trigger sendPushToUser with test payload', async () => {
      const result = await service.sendTestPush(mockUserId);
      expect(result.sent).toBe(1);
    });
  });
});
