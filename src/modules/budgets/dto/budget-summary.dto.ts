import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriodStatus } from '../schemas/budget-period.schema';

export class PayrollSurplusMetricsDto {
  @ApiProperty({
    example: 25000,
    description: 'Total income originating exclusively from payroll/salary (source: PAYROLL)',
  })
  totalPayrollIncome: number;

  @ApiProperty({
    example: 6100,
    description: 'Total sum of fixed recurring commitments (Services + Subscriptions + MSI)',
  })
  fixedCommitments: number;

  @ApiProperty({
    example: 1500,
    description: 'Total sum of utility services (electricity, water, internet, etc.)',
  })
  services: number;

  @ApiProperty({
    example: 600,
    description: 'Total sum of subscriptions (streaming, gym, software, etc.)',
  })
  subscriptions: number;

  @ApiProperty({
    example: 4000,
    description: 'Total sum of interest-free monthly installments (MSI)',
  })
  msi: number;

  @ApiProperty({
    example: 18900,
    description: 'Initial discretionary surplus: totalPayrollIncome - fixedCommitments',
  })
  initialDiscretionaryPayrollSurplus: number;

  @ApiProperty({
    example: 3000,
    description: 'Total amount already spent on regular personal discretionary purchases',
  })
  regularExpenses: number;

  @ApiProperty({
    example: 15900,
    description: 'Remaining discretionary surplus after deducting regular personal expenses',
  })
  remainingDiscretionaryPayrollSurplus: number;
}

export class PendingDebtorSummaryDto {
  @ApiPropertyOptional({ example: '654321654321654321654325' })
  personId?: string | null;

  @ApiProperty({ example: 'Carlos Mendoza' })
  name: string;

  @ApiProperty({
    example: 500,
    description: 'Outstanding amount owed by this debtor for the month',
  })
  amount: number;

  @ApiPropertyOptional({ example: '2026-10-05', description: 'Closest upcoming payment due date' })
  earliestDueDate?: string | null;

  @ApiProperty({ example: 1, description: 'Number of pending split collections from this debtor' })
  pendingCount: number;
}

export class DebtsSummaryMetricsDto {
  @ApiProperty({
    example: 1500,
    description:
      'Total sum of projected debt collection incomes pending to be received in this month',
  })
  pendingDebtCollections: number;

  @ApiProperty({
    type: [PendingDebtorSummaryDto],
    description: 'Breakdown of debtors with pending balances in this month',
  })
  debtors: PendingDebtorSummaryDto[];
}

export class BudgetSummaryResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  periodId: string;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 9 })
  month: number;

  @ApiProperty({ enum: BudgetPeriodStatus, example: BudgetPeriodStatus.OPEN })
  status: BudgetPeriodStatus;

  // General Balances (HU-08.1)
  @ApiProperty({ example: 5000, description: 'Carried savings transferred from previous month' })
  carriedSavings: number;

  @ApiProperty({ example: 26500, description: 'Total income (both received and projected)' })
  totalIncome: number;

  @ApiProperty({ example: 25000, description: 'Total income already marked as received' })
  totalReceivedIncome: number;

  @ApiProperty({ example: 9100, description: 'Total expenses recorded in the month' })
  totalExpenses: number;

  @ApiProperty({ example: 6100, description: 'Total expenses already marked as paid' })
  totalPaidExpenses: number;

  @ApiProperty({
    example: 22400,
    description: 'Net balance calculated as (carriedSavings + totalIncome) - totalExpenses',
  })
  netBalance: number;

  @ApiProperty({
    example: 23900,
    description:
      'Cash in pocket balance: (carriedSavings + totalReceivedIncome) - totalPaidExpenses',
  })
  cashInPocketBalance: number;

  // Payroll Surplus Metrics (HU-08.2)
  @ApiProperty({ type: PayrollSurplusMetricsDto })
  payrollSurplus: PayrollSurplusMetricsDto;

  // Pending Debts and Receivables (HU-08.3)
  @ApiProperty({ type: DebtsSummaryMetricsDto })
  receivables: DebtsSummaryMetricsDto;

  // Breakdown by Category
  @ApiProperty({
    example: { SERVICE: 1500, SUBSCRIPTION: 600, MSI: 4000, REGULAR_EXPENSE: 3000 },
    description: 'Total expenses aggregated by category',
  })
  expensesByCategory: Record<string, number>;

  // Breakdown by Source
  @ApiProperty({
    example: { PAYROLL: 25000, DEBT_COLLECTION: 1500 },
    description: 'Total incomes aggregated by source',
  })
  incomesBySource: Record<string, number>;
}
