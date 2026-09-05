import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PreviewStatementQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-10',
    description:
      'Transaction date to preview the statement cutoff and payment due date (YYYY-MM-DD). Defaults to today.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date must be a valid date string (YYYY-MM-DD)' })
  date?: string;
}

export class StatementPreviewResponseDto {
  @ApiPropertyOptional({
    example: '2026-09-15',
    description: 'Statement cutoff date for this purchase (null for DEBIT/CASH)',
  })
  cutoffDate: string | null;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: 'Payment due date when cash outflow occurs',
  })
  paymentDueDate: string;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Calendar year of the impacted budget period',
  })
  impactBudgetYear: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Month (1-12) of the impacted budget period',
  })
  impactBudgetMonth: number;

  @ApiPropertyOptional({
    example: '2026-10',
    description: 'Budget period identifier (YYYY-MM)',
  })
  impactBudgetPeriod: string;

  @ApiPropertyOptional({
    example: 25,
    description: 'Days remaining from purchase date until payment due date',
  })
  daysUntilDue: number;
}
