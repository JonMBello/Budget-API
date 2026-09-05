import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CopyIncomesDto {
  @ApiProperty({
    example: '654321654321654321654310',
    description: 'Source BudgetPeriod ID from which to copy recurring incomes (e.g. August)',
  })
  @IsNotEmpty({ message: 'fromPeriodId is required' })
  @IsMongoId({ message: 'Invalid fromPeriodId format' })
  fromPeriodId: string;

  @ApiProperty({
    example: '654321654321654321654320',
    description: 'Target BudgetPeriod ID to which incomes will be replicated (e.g. September)',
  })
  @IsNotEmpty({ message: 'toPeriodId is required' })
  @IsMongoId({ message: 'Invalid toPeriodId format' })
  toPeriodId: string;
}
