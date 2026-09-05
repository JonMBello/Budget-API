import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency } from '../../users/schemas/user.schema';
import { RecurringCategory } from '../schemas/recurring-template.schema';
import { SplitInfoDto } from './split-info.dto';

export class CreateRecurringDto {
  @ApiProperty({
    example: 'Netflix Premium 4K',
    description: 'Name or description of the recurring expense or purchase',
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  title: string;

  @ApiProperty({
    enum: RecurringCategory,
    example: RecurringCategory.SUBSCRIPTION,
    description: 'Category of recurring charge: SERVICE, SUBSCRIPTION, MSI, or OTHER_RECURRING',
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(RecurringCategory, {
    message: 'Category must be one of: SERVICE, SUBSCRIPTION, MSI, OTHER_RECURRING',
  })
  category: RecurringCategory;

  @ApiPropertyOptional({
    example: '654321654321654321654322',
    description: 'AccountCard ID used to pay this charge',
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid cardId format' })
  cardId?: string;

  @ApiPropertyOptional({
    example: 219,
    description: 'Monthly charge amount or monthly installment amount',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount?: number;

  @ApiPropertyOptional({
    enum: Currency,
    example: Currency.MXN,
    description: 'Currency of the charge (MXN or USD)',
  })
  @IsOptional()
  @IsEnum(Currency, { message: 'Currency must be either MXN or USD' })
  currency?: Currency;

  @ApiPropertyOptional({
    example: 1.0,
    description: 'Exchange rate to base currency',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Exchange rate must be a number' })
  @Min(0.0001, { message: 'Exchange rate must be positive' })
  exchangeRate?: number;

  @ApiPropertyOptional({
    example: 18000,
    description: 'Total purchase amount for MSI plans (e.g. $18,000 for 12 months)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total amount must be a number' })
  @Min(0.01, { message: 'Total amount must be at least 0.01' })
  totalAmount?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Total number of monthly installments for MSI plans (minimum 2)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total installments must be a number' })
  @Min(2, { message: 'MSI plans must have at least 2 installments' })
  totalInstallments?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Initial installment number when recording this plan (default: 1)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Current installment must be a number' })
  @Min(1, { message: 'Current installment must be at least 1' })
  currentInstallment?: number;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Start date of the subscription or MSI plan (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString({ message: 'Start date must be a string' })
  startDate?: string;

  @ApiPropertyOptional({
    type: SplitInfoDto,
    description: 'Optional split details if this charge is shared with someone in the directory',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SplitInfoDto)
  split?: SplitInfoDto;

  @ApiPropertyOptional({
    example: 'Auto-charged on the 5th of each month',
    description: 'Additional notes or reminders',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
