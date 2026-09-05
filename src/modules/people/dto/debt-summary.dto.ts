import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MsiDebtItemDto {
  @ApiProperty({ example: '654321654321654321654322' })
  id: string;

  @ApiProperty({ example: 'MacBook Air M2 (12 MSI)' })
  title: string;

  @ApiProperty({ example: 'BBVA Platinum' })
  cardName: string;

  @ApiProperty({ example: 4, description: 'Current installment number' })
  currentInstallment: number;

  @ApiProperty({ example: 12, description: 'Total number of installments' })
  totalInstallments: number;

  @ApiProperty({ example: 1500, description: 'Monthly installment amount' })
  installmentAmount: number;

  @ApiProperty({
    example: 13500,
    description: 'Remaining balance to be paid across future installments',
  })
  remainingAmount: number;

  @ApiPropertyOptional({ example: '2026-10-05', description: 'Next payment due date (YYYY-MM-DD)' })
  nextDueDate?: string | null;
}

export class RecurringDebtItemDto {
  @ApiProperty({ example: '654321654321654321654323' })
  id: string;

  @ApiProperty({ example: 'Netflix Premium Plan (Shared 50%)' })
  title: string;

  @ApiProperty({ example: 'Santander LikeU' })
  cardName: string;

  @ApiProperty({ example: 150, description: 'Monthly recurring share amount' })
  amount: number;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Next charge/payment due date (YYYY-MM-DD)',
  })
  nextDueDate?: string | null;
}

export class SingleExpenseDebtItemDto {
  @ApiProperty({ example: '654321654321654321654324' })
  id: string;

  @ApiProperty({ example: 'Friday Dinner Split' })
  title: string;

  @ApiProperty({ example: 'BBVA Platinum' })
  cardName: string;

  @ApiProperty({ example: 350.5, description: 'Amount owed for this expense' })
  amount: number;

  @ApiProperty({ example: '2026-09-02', description: 'Expense date (YYYY-MM-DD)' })
  date: string;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: 'Payment due date based on card cycle (YYYY-MM-DD)',
  })
  paymentDueDate?: string | null;

  @ApiProperty({ example: false, description: 'Whether this debt item has been paid' })
  isPaid: boolean;
}

export class DebtSummaryResponseDto {
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

  @ApiProperty({ example: 14000.5, description: 'Total outstanding debt across all active items' })
  totalDebt: number;

  @ApiProperty({
    example: 2000.5,
    description: 'Amount due in the immediate/current statement period',
  })
  immediateDueAmount: number;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: 'Closest upcoming payment due date among all associated cards (YYYY-MM-DD)',
  })
  nextPaymentDueDate?: string | null;

  @ApiProperty({ type: [MsiDebtItemDto], description: 'Active interest-free installment plans' })
  msiInstallments: MsiDebtItemDto[];

  @ApiProperty({
    type: [RecurringDebtItemDto],
    description: 'Active shared recurring subscriptions or services',
  })
  recurringServices: RecurringDebtItemDto[];

  @ApiProperty({
    type: [SingleExpenseDebtItemDto],
    description: 'Pending single or ad-hoc shared expenses',
  })
  singleExpenses: SingleExpenseDebtItemDto[];
}
