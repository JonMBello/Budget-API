import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { SplitType } from '../../recurring/schemas/recurring-template.schema';

export class ExpenseSplitDto {
  @ApiProperty({
    example: '654321654321654321654321',
    description: 'Debtor Person ID with whom this expense is shared',
  })
  @IsNotEmpty({ message: 'personId is required for split' })
  @IsMongoId({ message: 'Invalid personId format' })
  personId: string;

  @ApiProperty({
    enum: SplitType,
    example: SplitType.PERCENTAGE,
    description: 'Split calculation type: PERCENTAGE or FIXED',
  })
  @IsNotEmpty({ message: 'splitType is required' })
  @IsEnum(SplitType, { message: 'splitType must be either PERCENTAGE or FIXED' })
  splitType: SplitType;

  @ApiProperty({
    example: 50,
    description: 'Value of split (percentage rate 1-100 or fixed amount)',
  })
  @IsNotEmpty({ message: 'splitValue is required' })
  @IsNumber({}, { message: 'splitValue must be a number' })
  @Min(0.01, { message: 'splitValue must be greater than 0' })
  splitValue: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the debt is active and uncollected',
  })
  @IsOptional()
  @IsBoolean({ message: 'isDebtActive must be a boolean' })
  isDebtActive?: boolean;
}
