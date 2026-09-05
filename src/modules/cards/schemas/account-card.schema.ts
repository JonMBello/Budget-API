import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AccountCardType } from '../../../common/utils/card-cycle.util';

export type AccountCardDocument = AccountCard & Document;

@Schema({ timestamps: true })
export class AccountCard {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: Object.values(AccountCardType),
    required: true,
    default: AccountCardType.CREDIT,
  })
  type: AccountCardType;

  @Prop({ type: Number, min: 1, max: 31, default: null })
  cutoffDay?: number | null;

  @Prop({ type: Number, min: 1, max: 31, default: null })
  paymentDueDay?: number | null;

  @Prop({ type: String, default: '#3F51B5' })
  color?: string;

  @Prop({ type: String, default: null })
  last4Digits?: string | null;

  @Prop({ type: Number, min: 0, default: null })
  creditLimit?: number | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AccountCardSchema = SchemaFactory.createForClass(AccountCard);

// Compound index for fast multi-tenant active cards queries
AccountCardSchema.index({ userId: 1, isActive: 1 });
