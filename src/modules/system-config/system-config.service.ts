import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SystemConfig,
  SystemConfigDocument,
  SystemConfigKey,
} from './schemas/system-config.schema';

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectModel(SystemConfig.name)
    private readonly configModel: Model<SystemConfigDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaultConfig(
        SystemConfigKey.NOTIFICATIONS_ENABLED,
        false,
        'Flag maestro para habilitar o deshabilitar todos los envíos de notificaciones (cron, pruebas y alertas manuales)',
      );
    } catch (error: any) {
      this.logger.error(`Error initializing default system configs: ${error.message}`);
    }
  }

  async ensureDefaultConfig(key: string, defaultValue: any, description: string): Promise<void> {
    const uppercaseKey = key.toUpperCase();
    const existing = await this.configModel.findOne({ key: uppercaseKey }).exec();
    if (!existing) {
      await this.configModel.create({
        key: uppercaseKey,
        value: defaultValue,
        description,
      });
      this.logger.log(`Seeded default system config: ${uppercaseKey} = ${JSON.stringify(defaultValue)}`);
    }
  }

  async isFeatureEnabled(key: string, defaultValue = false): Promise<boolean> {
    try {
      const config = await this.configModel.findOne({ key: key.toUpperCase() }).exec();
      if (!config) {
        return defaultValue;
      }
      return Boolean(config.value);
    } catch (error: any) {
      this.logger.error(`Error reading config key ${key}: ${error.message}`);
      return defaultValue;
    }
  }

  async isNotificationsEnabled(): Promise<boolean> {
    return this.isFeatureEnabled(SystemConfigKey.NOTIFICATIONS_ENABLED, false);
  }

  async get<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
    const config = await this.configModel.findOne({ key: key.toUpperCase() }).exec();
    if (!config) {
      return defaultValue;
    }
    return config.value as T;
  }

  async set(key: string, value: any, description?: string): Promise<SystemConfigDocument> {
    const uppercaseKey = key.toUpperCase();
    const updateData: Record<string, any> = { value };
    if (description !== undefined) {
      updateData.description = description;
    }

    return this.configModel
      .findOneAndUpdate(
        { key: uppercaseKey },
        { $set: updateData },
        { new: true, upsert: true },
      )
      .exec();
  }
}
