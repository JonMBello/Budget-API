import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class InitializeBudgetDto {
  @ApiPropertyOptional({
    example: 2026,
    description: 'Budget year (defaults to next consecutive month or current calendar year)',
  })
  @IsOptional()
  @IsInt({ message: 'Year must be an integer' })
  @Min(2020, { message: 'Year must be at least 2020' })
  @Max(2100, { message: 'Year must be at most 2100' })
  year?: number;

  @ApiPropertyOptional({
    example: 9,
    description:
      'Budget month (1-12, defaults to next consecutive month or current calendar month)',
  })
  @IsOptional()
  @IsInt({ message: 'Month must be an integer' })
  @Min(1, { message: 'Month must be between 1 and 12' })
  @Max(12, { message: 'Month must be between 1 and 12' })
  month?: number;

  @ApiPropertyOptional({
    example: 5000,
    description:
      'Override carried savings from previous month (if omitted, automatically calculated)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Carried savings must be a number' })
  carriedSavings?: number;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Initial total income (defaults to 0)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total income must be a number' })
  totalIncome?: number;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Initial total expenses (defaults to 0)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total expenses must be a number' })
  totalExpenses?: number;

  @ApiPropertyOptional({
    example: 'Budget initialized for September 2026',
    description: 'Optional notes for this budget period',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
