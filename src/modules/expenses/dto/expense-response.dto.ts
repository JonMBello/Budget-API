import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SplitType } from '../../recurring/schemas/recurring-template.schema';
import { ExpenseCategory } from '../schemas/expense.schema';

export class ExpenseSplitResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  personId: string;

  @ApiProperty({ enum: SplitType, example: SplitType.PERCENTAGE })
  splitType: SplitType;

  @ApiProperty({ example: 50 })
  splitValue: number;

  @ApiProperty({ example: 1500 })
  splitAmount: number;

  @ApiProperty({ example: true })
  isDebtActive: boolean;

  @ApiPropertyOptional({ example: '654321654321654321654325' })
  linkedIncomeId?: string | null;
}

export class ExpenseResponseDto {
  @ApiProperty({ example: '654321654321654321654326' })
  id: string;

  @ApiProperty({ example: '654321654321654321654320' })
  userId: string;

  @ApiProperty({ example: '654321654321654321654319' })
  periodId: string;

  @ApiPropertyOptional({ example: '654321654321654321654323' })
  templateId?: string | null;

  @ApiPropertyOptional({ example: '654321654321654321654322' })
  cardId?: string | null;

  @ApiProperty({ example: 'Family Dinner at Italian Restaurant' })
  title: string;

  @ApiProperty({ example: 3000 })
  amount: number;

  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.FOOD })
  category: ExpenseCategory;

  @ApiProperty({ example: '2026-09-02' })
  date: string;

  @ApiPropertyOptional({ example: '2026-10-05' })
  paymentDueDate?: string | null;

  @ApiProperty({ example: false })
  isPaid: boolean;

  @ApiPropertyOptional({ type: ExpenseSplitResponseDto })
  split?: ExpenseSplitResponseDto | null;

  @ApiPropertyOptional({ example: 'Dinner split with brother' })
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-09-02T00:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-02T00:00:00.000Z' })
  updatedAt?: Date;
}
