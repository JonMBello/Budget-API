import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBudgetDto {
  @ApiPropertyOptional({
    example: 25000,
    description: 'Updated total monthly income / earnings for this period',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total income must be a number' })
  @Min(0, { message: 'Total income must be at least 0' })
  totalIncome?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Updated carried savings transferred into this budget period',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Carried savings must be a number' })
  carriedSavings?: number;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Updated total expenses recorded in this period',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total expenses must be a number' })
  @Min(0, { message: 'Total expenses must be at least 0' })
  totalExpenses?: number;

  @ApiPropertyOptional({
    example: 'Updated notes for this budget period',
    description: 'Notes or context for this budget period',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
