import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BudgetPeriodStatus } from '../schemas/budget-period.schema';

export class UpdateStatusDto {
  @ApiProperty({
    enum: BudgetPeriodStatus,
    example: BudgetPeriodStatus.CLOSED,
    description: 'Updated lifecycle status of the budget period',
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(BudgetPeriodStatus, { message: 'Status must be either OPEN or CLOSED' })
  status: BudgetPeriodStatus;
}
