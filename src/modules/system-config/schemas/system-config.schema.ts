import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SystemConfigDocument = SystemConfig & Document;

export enum SystemConfigKey {
  NOTIFICATIONS_ENABLED = 'NOTIFICATIONS_ENABLED',
}

@Schema({ timestamps: true, collection: 'system_configs' })
export class SystemConfig {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  value: any;

  @Prop({ trim: true, default: '' })
  description?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
