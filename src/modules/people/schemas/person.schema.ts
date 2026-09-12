import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PersonDocument = Person & Document;

@Schema({ timestamps: true, collection: 'people' })
export class Person {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  phoneCode?: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone?: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email?: string | null;

  @Prop({ type: String, default: null })
  notes?: string | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PersonSchema = SchemaFactory.createForClass(Person);

// Compound index for user + name queries
PersonSchema.index({ userId: 1, name: 1 });

// Compound index for user + active status queries
PersonSchema.index({ userId: 1, isActive: 1 });
