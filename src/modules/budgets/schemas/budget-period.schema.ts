import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BudgetPeriodDocument = BudgetPeriod & Document;

export enum BudgetPeriodStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Schema({ timestamps: true })
export class BudgetPeriod {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 2020, max: 2100 })
  year: number;

  @Prop({ type: Number, required: true, min: 1, max: 12 })
  month: number;

  @Prop({
    type: String,
    enum: Object.values(BudgetPeriodStatus),
    required: true,
    default: BudgetPeriodStatus.OPEN,
  })
  status: BudgetPeriodStatus;

  @Prop({ type: Number, required: true, default: 0 })
  carriedSavings: number;

  @Prop({ type: Number, required: true, default: 0 })
  totalIncome: number;

  @Prop({ type: Number, required: true, default: 0 })
  totalExpenses: number;

  @Prop({ type: String, trim: true, default: null })
  notes?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BudgetPeriodSchema = SchemaFactory.createForClass(BudgetPeriod);

// Unique compound index: only one period per user, year, and month
BudgetPeriodSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

// Compound index for sorting history chronologically
BudgetPeriodSchema.index({ userId: 1, year: -1, month: -1 });
