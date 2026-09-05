import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncomeSource } from '../schemas/income.schema';

export class IncomeResponseDto {
  @ApiProperty({ example: '654321654321654321654324' })
  id: string;

  @ApiProperty({ example: '654321654321654321654320' })
  userId: string;

  @ApiProperty({ example: '654321654321654321654319' })
  periodId: string;

  @ApiProperty({ example: 'Bi-weekly Payroll' })
  title: string;

  @ApiProperty({ example: 15000 })
  amount: number;

  @ApiProperty({ example: '2026-09-15' })
  date: string;

  @ApiProperty({ enum: IncomeSource, example: IncomeSource.PAYROLL })
  source: IncomeSource;

  @ApiProperty({ example: false })
  isReceived: boolean;

  @ApiPropertyOptional({ example: '2026-09-15' })
  dueDate?: string | null;

  @ApiPropertyOptional({ example: '654321654321654321654325' })
  linkedExpenseId?: string | null;

  @ApiPropertyOptional({ example: '654321654321654321654321' })
  debtorPersonId?: string | null;

  @ApiPropertyOptional({ example: 'First fortnight payroll deposit' })
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  updatedAt?: Date;
}
