import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationLogDocument = NotificationLog & Document;

export enum NotificationChannel {
  WEB_PUSH = 'WEB_PUSH',
  EMAIL = 'EMAIL',
}

export enum NotificationTargetType {
  CARD_PAYMENT_DUE = 'CARD_PAYMENT_DUE',
  SERVICE_DUE = 'SERVICE_DUE',
  DEBT_COLLECTION_DUE = 'DEBT_COLLECTION_DUE',
  TEST = 'TEST',
}

export enum NotificationStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true, collection: 'notification_logs' })
export class NotificationLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationChannel),
    required: true,
  })
  channel: NotificationChannel;

  @Prop({
    type: String,
    enum: Object.values(NotificationTargetType),
    required: true,
  })
  targetType: NotificationTargetType;

  @Prop({ required: true })
  targetId: string;

  @Prop({ required: true, trim: true })
  recipient: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationStatus),
    required: true,
    default: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @Prop({ type: Date, default: Date.now, index: true })
  sentAt: Date;

  @Prop({ type: String, default: null })
  errorDetails?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

// Compound index for checking duplicate sent notifications
NotificationLogSchema.index({ userId: 1, targetType: 1, targetId: 1, sentAt: -1 });
