import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRecurringDto } from './create-recurring.dto';

export class UpdateRecurringDto extends PartialType(CreateRecurringDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether this recurring charge is currently active',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this plan has completed all installments',
  })
  @IsOptional()
  @IsBoolean({ message: 'isCompleted must be a boolean' })
  isCompleted?: boolean;
}
