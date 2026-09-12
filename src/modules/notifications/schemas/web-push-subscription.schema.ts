import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WebPushSubscriptionDocument = WebPushSubscription & Document;

@Schema({ _id: false })
export class WebPushKeys {
  @Prop({ required: true })
  p256dh: string;

  @Prop({ required: true })
  auth: string;
}

@Schema({ timestamps: true, collection: 'web_push_subscriptions' })
export class WebPushSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  endpoint: string;

  @Prop({ type: WebPushKeys, required: true })
  keys: WebPushKeys;

  @Prop({ type: String, trim: true, default: null })
  device?: string | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WebPushSubscriptionSchema = SchemaFactory.createForClass(WebPushSubscription);

// Compound index for user and endpoint
WebPushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
