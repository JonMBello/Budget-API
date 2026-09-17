import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MsiDebtItemDto,
  RecurringDebtItemDto,
  SingleExpenseDebtItemDto,
} from './debt-summary.dto';

export class PeriodDebtsDto {
  @ApiProperty({ example: '2026-09', description: 'Period identifier in YYYY-MM format' })
  period: string;

  @ApiProperty({ example: 2026, description: 'Budget year' })
  year: number;

  @ApiProperty({ example: 9, description: 'Budget month (1-12)' })
  month: number;

  @ApiPropertyOptional({ example: 'Septiembre 2026', description: 'Friendly localized period name' })
  periodName?: string;

  @ApiPropertyOptional({
    example: '654321654321654321654320',
    description: 'MongoDB BudgetPeriod ID if exists, or null for projected future periods',
  })
  periodId?: string | null;

  @ApiProperty({
    example: 2250.5,
    description: 'Total pending debt for this specific period',
  })
  totalDebt: number;

  @ApiProperty({
    type: [MsiDebtItemDto],
    description: 'MSI installments corresponding to this period',
  })
  msiInstallments: MsiDebtItemDto[];

  @ApiProperty({
    type: [RecurringDebtItemDto],
    description: 'Active recurring subscriptions or services for this period',
  })
  recurringServices: RecurringDebtItemDto[];

  @ApiProperty({
    type: [SingleExpenseDebtItemDto],
    description: 'Pending single or ad-hoc shared expenses for this period',
  })
  singleExpenses: SingleExpenseDebtItemDto[];
}

export class DebtSummaryV2ResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  personId: string;

  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  @ApiPropertyOptional({ example: '+52' })
  phoneCode?: string | null;

  @ApiPropertyOptional({ example: '8181234567' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'juan.perez@example.com' })
  email?: string | null;

  @ApiProperty({
    example: 14000.5,
    description: 'Total outstanding debt accumulated across all categories and periods',
  })
  totalDebt: number;

  @ApiProperty({
    type: [PeriodDebtsDto],
    description: 'List of debts grouped and broken down by budget period (e.g. September, October)',
  })
  periods: PeriodDebtsDto[];
}
