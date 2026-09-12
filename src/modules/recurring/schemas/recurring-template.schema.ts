import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Currency } from '../../users/schemas/user.schema';

export type RecurringTemplateDocument = RecurringTemplate & Document;

export enum RecurringCategory {
  SERVICE = 'SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  MSI = 'MSI',
  OTHER_RECURRING = 'OTHER_RECURRING',
}

export enum SplitType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

@Schema({ _id: false })
export class SplitInfo {
  @Prop({ type: Types.ObjectId, ref: 'Person', required: true })
  personId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(SplitType), required: true })
  splitType: SplitType;

  @Prop({ type: Number, required: true, min: 0 })
  splitValue: number;

  @Prop({ type: Number, required: true, min: 0 })
  splitAmount: number;
}

export const SplitInfoSchema = SchemaFactory.createForClass(SplitInfo);

@Schema({ timestamps: true, collection: 'recurring_templates' })
export class RecurringTemplate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({
    type: String,
    enum: Object.values(RecurringCategory),
    required: true,
  })
  category: RecurringCategory;

  @Prop({ type: Types.ObjectId, ref: 'AccountCard', default: null })
  cardId?: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount: number;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.MXN })
  currency: Currency;

  @Prop({ type: Number, default: 1.0, min: 0.0001 })
  exchangeRate: number;

  @Prop({ type: Number, default: null })
  totalAmount?: number | null;

  @Prop({ type: Number, min: 2, default: null })
  totalInstallments?: number | null;

  @Prop({ type: Number, min: 1, default: null })
  currentInstallment?: number | null;

  @Prop({ type: Number, default: null })
  lastInstantiatedYear?: number | null;

  @Prop({ type: Number, default: null })
  lastInstantiatedMonth?: number | null;

  @Prop({ type: String, default: null })
  startDate?: string | null;

  @Prop({ type: SplitInfoSchema, default: null })
  split?: SplitInfo | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isCompleted: boolean;

  @Prop({ type: String, trim: true, default: null })
  notes?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RecurringTemplateSchema = SchemaFactory.createForClass(RecurringTemplate);

// Compound indexes
RecurringTemplateSchema.index({ userId: 1, isActive: 1 });
RecurringTemplateSchema.index({ userId: 1, category: 1 });
RecurringTemplateSchema.index({ userId: 1, 'split.personId': 1 });
