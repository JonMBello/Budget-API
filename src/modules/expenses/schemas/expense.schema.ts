import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SplitType } from '../../recurring/schemas/recurring-template.schema';

export type ExpenseDocument = Expense & Document;

export enum ExpenseCategory {
  SERVICE = 'SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  MSI = 'MSI',
  REGULAR_EXPENSE = 'REGULAR_EXPENSE',
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  HOUSING = 'HOUSING',
  HEALTH = 'HEALTH',
  ENTERTAINMENT = 'ENTERTAINMENT',
  SHOPPING = 'SHOPPING',
  OTHER = 'OTHER',
}

@Schema({ _id: false })
export class ExpenseSplit {
  @Prop({ type: Types.ObjectId, ref: 'Person', required: true })
  personId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(SplitType), required: true })
  splitType: SplitType;

  @Prop({ type: Number, required: true, min: 0 })
  splitValue: number;

  @Prop({ type: Number, required: true, min: 0 })
  splitAmount: number;

  @Prop({ type: Boolean, default: true })
  isDebtActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Income', default: null })
  linkedIncomeId?: Types.ObjectId | null;
}

export const ExpenseSplitSchema = SchemaFactory.createForClass(ExpenseSplit);

@Schema({ timestamps: true })
export class Expense {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BudgetPeriod', required: true, index: true })
  periodId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RecurringTemplate', default: null })
  templateId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'AccountCard', default: null })
  cardId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount: number;

  @Prop({
    type: String,
    enum: Object.values(ExpenseCategory),
    required: true,
  })
  category: ExpenseCategory;

  @Prop({ type: String, required: true, trim: true })
  date: string;

  @Prop({ type: String, default: null })
  paymentDueDate?: string | null;

  @Prop({ type: Boolean, default: false })
  isPaid: boolean;

  @Prop({ type: ExpenseSplitSchema, default: null })
  split?: ExpenseSplit | null;

  @Prop({ type: String, trim: true, default: null })
  notes?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

// Compound indexes
ExpenseSchema.index({ userId: 1, periodId: 1 });
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, 'split.personId': 1 });
