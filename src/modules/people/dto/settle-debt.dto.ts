import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SettleDebtDto {
  @ApiPropertyOptional({
    example: 500,
    description: 'Amount paid towards the debt balance',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount?: number;

  @ApiPropertyOptional({
    example: '654321654321654321654324',
    description: 'Specific expense ID to mark as settled',
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid expenseId format' })
  expenseId?: string;

  @ApiPropertyOptional({
    example: '654321654321654321654323',
    description: 'Specific recurring template / service ID to mark as settled',
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid recurringTemplateId format' })
  recurringTemplateId?: string;

  @ApiPropertyOptional({
    example: 'Paid via SPEI transfer',
    description: 'Notes regarding the payment or settlement',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

export class SettleDebtResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Debt settled successfully' })
  message: string;

  @ApiProperty({ example: '654321654321654321654321' })
  personId: string;

  @ApiProperty({ example: 500 })
  amount: number;

  @ApiProperty({ example: '2026-09-04T08:00:00.000Z' })
  settledAt: Date;
}
