import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class InstantiateRecurringDto {
  @ApiProperty({
    example: '654321654321654321654320',
    description:
      'Target BudgetPeriod ID for which to instantiate recurring expenses and MSI installments',
  })
  @IsNotEmpty({ message: 'periodId is required' })
  @IsMongoId({ message: 'periodId must be a valid Mongo ObjectId' })
  periodId: string;
}
