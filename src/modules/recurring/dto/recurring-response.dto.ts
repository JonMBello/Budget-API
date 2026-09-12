import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../users/schemas/user.schema';
import { RecurringCategory, SplitType } from '../schemas/recurring-template.schema';

export class SplitResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  personId: string;

  @ApiProperty({ enum: SplitType, example: SplitType.PERCENTAGE })
  splitType: SplitType;

  @ApiProperty({ example: 50 })
  splitValue: number;

  @ApiProperty({ example: 109.5 })
  splitAmount: number;
}

export class RecurringResponseDto {
  @ApiProperty({ example: '654321654321654321654323' })
  id: string;

  @ApiProperty({ example: '654321654321654321654320' })
  userId: string;

  @ApiProperty({ example: 'Netflix Premium 4K' })
  title: string;

  @ApiProperty({ enum: RecurringCategory, example: RecurringCategory.SUBSCRIPTION })
  category: RecurringCategory;

  @ApiPropertyOptional({ example: '654321654321654321654322' })
  cardId?: string | null;

  @ApiProperty({ example: 219 })
  amount: number;

  @ApiProperty({ enum: Currency, example: Currency.MXN })
  currency: Currency;

  @ApiProperty({ example: 1.0 })
  exchangeRate: number;

  @ApiPropertyOptional({ example: 18000 })
  totalAmount?: number | null;

  @ApiPropertyOptional({ example: 12 })
  totalInstallments?: number | null;

  @ApiPropertyOptional({ example: 1 })
  currentInstallment?: number | null;

  @ApiPropertyOptional({ example: '2026-09-01' })
  startDate?: string | null;

  @ApiPropertyOptional({ type: SplitResponseDto })
  split?: SplitResponseDto | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  isCompleted: boolean;

  @ApiPropertyOptional({ example: 'Auto-charged on the 5th' })
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  updatedAt?: Date;
}

export class InstantiatedItemDto {
  @ApiProperty({ example: '654321654321654321654323' })
  templateId: string;

  @ApiProperty({ example: 'PlayStation 5 (Cuota 2/6)' })
  title: string;

  @ApiProperty({ enum: RecurringCategory, example: RecurringCategory.MSI })
  category: RecurringCategory;

  @ApiProperty({ example: 1500 })
  amount: number;

  @ApiPropertyOptional({ example: '654321654321654321654322' })
  cardId?: string | null;

  @ApiPropertyOptional({ example: 2 })
  currentInstallment?: number | null;

  @ApiPropertyOptional({ example: 6 })
  totalInstallments?: number | null;

  @ApiProperty({ example: false })
  isFinalInstallment: boolean;

  @ApiPropertyOptional({ type: SplitResponseDto })
  split?: SplitResponseDto | null;
}

export class InstantiateResultDto {
  @ApiProperty({ example: '654321654321654321654320' })
  periodId: string;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 9 })
  month: number;

  @ApiProperty({ example: 3 })
  createdCount: number;

  @ApiProperty({ example: 2 })
  skippedCount: number;
}
