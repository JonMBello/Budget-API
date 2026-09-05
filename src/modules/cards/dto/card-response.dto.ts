import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountCardType } from '../../../common/utils/card-cycle.util';

export class CardResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  id: string;

  @ApiProperty({ example: 'BBVA Platinum' })
  name: string;

  @ApiProperty({ enum: AccountCardType, example: AccountCardType.CREDIT })
  type: AccountCardType;

  @ApiPropertyOptional({ example: 15 })
  cutoffDay?: number | null;

  @ApiPropertyOptional({ example: 5 })
  paymentDueDay?: number | null;

  @ApiPropertyOptional({ example: '#1E88E5' })
  color?: string;

  @ApiPropertyOptional({ example: '1234' })
  last4Digits?: string | null;

  @ApiPropertyOptional({ example: 50000 })
  creditLimit?: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-09-04T08:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-04T08:00:00.000Z' })
  updatedAt?: Date;
}
