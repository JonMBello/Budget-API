import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IncomeDocument = Income & Document;

export enum IncomeSource {
  PAYROLL = 'PAYROLL',
  DEBT_COLLECTION = 'DEBT_COLLECTION',
  DEPOSIT = 'DEPOSIT',
  INVESTMENT = 'INVESTMENT',
  OTHER = 'OTHER',
}

@Schema({ timestamps: true, collection: 'incomes' })
export class Income {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BudgetPeriod', required: true, index: true })
  periodId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount: number;

  @Prop({ type: String, required: true, trim: true })
  date: string;

  @Prop({
    type: String,
    enum: Object.values(IncomeSource),
    required: true,
  })
  source: IncomeSource;

  @Prop({ type: Boolean, default: false, index: true })
  isReceived: boolean;

  @Prop({ type: String, default: null })
  dueDate?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Expense', default: null })
  linkedExpenseId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Person', default: null })
  debtorPersonId?: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  notes?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const IncomeSchema = SchemaFactory.createForClass(Income);

// Compound indexes
IncomeSchema.index({ userId: 1, periodId: 1 });
IncomeSchema.index({ userId: 1, date: -1 });
IncomeSchema.index({ userId: 1, debtorPersonId: 1 });
IncomeSchema.index({ userId: 1, linkedExpenseId: 1 });
