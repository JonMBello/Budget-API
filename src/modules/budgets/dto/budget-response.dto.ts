import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriodStatus } from '../schemas/budget-period.schema';

export class BudgetResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  id: string;

  @ApiProperty({ example: '654321654321654321654320' })
  userId: string;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 9 })
  month: number;

  @ApiProperty({ enum: BudgetPeriodStatus, example: BudgetPeriodStatus.OPEN })
  status: BudgetPeriodStatus;

  @ApiProperty({ example: 5000, description: 'Carried savings transferred from previous month' })
  carriedSavings: number;

  @ApiProperty({ example: 15000, description: 'Total income recorded in this period' })
  totalIncome: number;

  @ApiProperty({ example: 10000, description: 'Total expenses recorded in this period' })
  totalExpenses: number;

  @ApiProperty({
    example: 10000,
    description: 'Net balance calculated as (carriedSavings + totalIncome - totalExpenses)',
  })
  netBalance: number;

  @ApiPropertyOptional({ example: 'Budget initialized for September 2026' })
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  updatedAt?: Date;
}
