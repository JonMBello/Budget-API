import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { SplitType } from '../schemas/recurring-template.schema';

export class SplitInfoDto {
  @ApiProperty({
    example: '654321654321654321654321',
    description: 'Person ID of the debtor sharing this recurring charge',
  })
  @IsNotEmpty({ message: 'personId is required for split' })
  @IsMongoId({ message: 'Invalid personId format' })
  personId: string;

  @ApiProperty({
    enum: SplitType,
    example: SplitType.PERCENTAGE,
    description: 'Type of split: PERCENTAGE (e.g. 50%) or FIXED (e.g. $150)',
  })
  @IsNotEmpty({ message: 'splitType is required for split' })
  @IsEnum(SplitType, { message: 'splitType must be either PERCENTAGE or FIXED' })
  splitType: SplitType;

  @ApiProperty({
    example: 50,
    description: 'Value of the split: percentage rate (1-100) or fixed amount',
  })
  @IsNotEmpty({ message: 'splitValue is required' })
  @IsNumber({}, { message: 'splitValue must be a number' })
  @Min(0.01, { message: 'splitValue must be greater than 0' })
  splitValue: number;
}
