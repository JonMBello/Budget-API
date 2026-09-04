import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum Currency {
  MXN = 'MXN',
  USD = 'USD',
}

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: Currency,
    default: Currency.MXN,
  })
  currency: Currency;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  refreshTokenHash?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
