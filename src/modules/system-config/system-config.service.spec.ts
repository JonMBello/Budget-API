import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SystemConfigService } from './system-config.service';
import { SystemConfig, SystemConfigKey } from './schemas/system-config.schema';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let mockConfigModel: any;

  beforeEach(async () => {
    mockConfigModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        {
          provide: getModelToken(SystemConfig.name),
          useValue: mockConfigModel,
        },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should seed NOTIFICATIONS_ENABLED as false if it does not exist', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockConfigModel.create.mockResolvedValue({});

      await service.onModuleInit();

      expect(mockConfigModel.findOne).toHaveBeenCalledWith({
        key: SystemConfigKey.NOTIFICATIONS_ENABLED,
      });
      expect(mockConfigModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: SystemConfigKey.NOTIFICATIONS_ENABLED,
          value: false,
        }),
      );
    });

    it('should not seed NOTIFICATIONS_ENABLED if it already exists', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          key: SystemConfigKey.NOTIFICATIONS_ENABLED,
          value: true,
        }),
      });

      await service.onModuleInit();

      expect(mockConfigModel.findOne).toHaveBeenCalledWith({
        key: SystemConfigKey.NOTIFICATIONS_ENABLED,
      });
      expect(mockConfigModel.create).not.toHaveBeenCalled();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true when config value in Mongo is true', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          key: 'SOME_FLAG',
          value: true,
        }),
      });

      const result = await service.isFeatureEnabled('SOME_FLAG');
      expect(result).toBe(true);
      expect(mockConfigModel.findOne).toHaveBeenCalledWith({ key: 'SOME_FLAG' });
    });

    it('should return false when config value in Mongo is false', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          key: 'SOME_FLAG',
          value: false,
        }),
      });

      const result = await service.isFeatureEnabled('SOME_FLAG');
      expect(result).toBe(false);
    });

    it('should return default value (false) when key is not found', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.isFeatureEnabled('NOT_FOUND_KEY');
      expect(result).toBe(false);
    });

    it('should return custom default value when key is not found and defaultValue is provided', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.isFeatureEnabled('NOT_FOUND_KEY', true);
      expect(result).toBe(true);
    });

    it('should return default value if DB throws an error', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB connection error')),
      });

      const result = await service.isFeatureEnabled('SOME_FLAG', false);
      expect(result).toBe(false);
    });
  });

  describe('isNotificationsEnabled', () => {
    it('should check NOTIFICATIONS_ENABLED with default false', async () => {
      const isFeatureSpy = jest.spyOn(service, 'isFeatureEnabled').mockResolvedValue(false);

      const result = await service.isNotificationsEnabled();

      expect(result).toBe(false);
      expect(isFeatureSpy).toHaveBeenCalledWith(SystemConfigKey.NOTIFICATIONS_ENABLED, false);
    });
  });

  describe('get', () => {
    it('should return config value when found', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          key: 'SETTING',
          value: 123,
        }),
      });

      const result = await service.get<number>('SETTING');
      expect(result).toBe(123);
    });

    it('should return defaultValue when not found', async () => {
      mockConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.get<number>('SETTING', 456);
      expect(result).toBe(456);
    });
  });

  describe('set', () => {
    it('should upsert config value with uppercase key', async () => {
      const mockResult = { key: 'TEST_KEY', value: true };
      mockConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResult),
      });

      const result = await service.set('test_key', true, 'Test description');

      expect(mockConfigModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'TEST_KEY' },
        { $set: { value: true, description: 'Test description' } },
        { new: true, upsert: true },
      );
      expect(result).toEqual(mockResult);
    });
  });
});
