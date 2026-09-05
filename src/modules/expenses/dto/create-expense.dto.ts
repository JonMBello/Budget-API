import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExpenseCategory } from '../schemas/expense.schema';
import { ExpenseSplitDto } from './expense-split.dto';

export class CreateExpenseDto {
  @ApiProperty({
    example: '654321654321654321654320',
    description: 'BudgetPeriod ID to which this expense belongs',
  })
  @IsNotEmpty({ message: 'periodId is required' })
  @IsMongoId({ message: 'Invalid periodId format' })
  periodId: string;

  @ApiProperty({
    example: 'Family Dinner at Italian Restaurant',
    description: 'Title or description of the expense',
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  title: string;

  @ApiProperty({
    example: 3000,
    description: 'Total amount of the purchase or expense',
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;

  @ApiProperty({
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
    description: 'Expense category',
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(ExpenseCategory, {
    message: 'Category must be a valid ExpenseCategory',
  })
  category: ExpenseCategory;

  @ApiProperty({
    example: '2026-09-02',
    description: 'Date of the expense (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'Date is required' })
  @IsString({ message: 'Date must be a string' })
  date: string;

  @ApiPropertyOptional({
    example: '654321654321654321654322',
    description: 'AccountCard ID used to pay this expense',
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid cardId format' })
  cardId?: string;

  @ApiPropertyOptional({
    example: '654321654321654321654323',
    description: 'RecurringTemplate ID if generated from a recurring charge or MSI plan',
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid templateId format' })
  templateId?: string;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: 'Payment due date based on card cycle (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString({ message: 'paymentDueDate must be a string' })
  paymentDueDate?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this expense has already been paid/settled with the bank',
  })
  @IsOptional()
  @IsBoolean({ message: 'isPaid must be a boolean' })
  isPaid?: boolean;

  @ApiPropertyOptional({
    type: ExpenseSplitDto,
    description: 'Split settings if this expense is shared with another person',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpenseSplitDto)
  split?: ExpenseSplitDto;

  @ApiPropertyOptional({
    example: 'Dinner with siblings, 50% split with brother',
    description: 'Additional notes or context',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
