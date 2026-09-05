import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IncomeSource } from '../schemas/income.schema';

export class CreateIncomeDto {
  @ApiProperty({
    example: '654321654321654321654320',
    description: 'BudgetPeriod ID to which this income belongs',
  })
  @IsNotEmpty({ message: 'periodId is required' })
  @IsMongoId({ message: 'Invalid periodId format' })
  periodId: string;

  @ApiProperty({
    example: 'Bi-weekly Payroll',
    description: 'Income description or source title',
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  title: string;

  @ApiProperty({
    example: 15000,
    description: 'Income amount',
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;

  @ApiProperty({
    example: '2026-09-15',
    description: 'Income date (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'Date is required' })
  @IsString({ message: 'Date must be a string' })
  date: string;

  @ApiProperty({
    enum: IncomeSource,
    example: IncomeSource.PAYROLL,
    description: 'Source of income: PAYROLL, DEBT_COLLECTION, DEPOSIT, INVESTMENT, OTHER',
  })
  @IsNotEmpty({ message: 'Source is required' })
  @IsEnum(IncomeSource, {
    message: 'Source must be one of: PAYROLL, DEBT_COLLECTION, DEPOSIT, INVESTMENT, OTHER',
  })
  source: IncomeSource;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the income has already been deposited/received',
  })
  @IsOptional()
  @IsBoolean({ message: 'isReceived must be a boolean' })
  isReceived?: boolean;

  @ApiPropertyOptional({
    example: '2026-09-15',
    description: 'Projected or due date for payment collection (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString({ message: 'dueDate must be a string' })
  dueDate?: string;

  @ApiPropertyOptional({
    example: '654321654321654321654321',
    description: 'Debtor Person ID if this income is a debt collection from someone',
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid debtorPersonId format' })
  debtorPersonId?: string;

  @ApiPropertyOptional({
    example: 'First fortnight payroll deposit',
    description: 'Additional notes or reference',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
