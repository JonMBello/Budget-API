import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class InstantiateRecurringDto {
  @ApiProperty({
    example: 2026,
    description: 'Target year for which to instantiate recurring expenses and MSI installments',
  })
  @IsNotEmpty({ message: 'Year is required' })
  @IsInt({ message: 'Year must be an integer' })
  @Min(2020, { message: 'Year must be at least 2020' })
  @Max(2100, { message: 'Year must be at most 2100' })
  year: number;

  @ApiProperty({
    example: 9,
    description: 'Target month (1-12) for which to instantiate recurring expenses',
  })
  @IsNotEmpty({ message: 'Month is required' })
  @IsInt({ message: 'Month must be an integer' })
  @Min(1, { message: 'Month must be between 1 and 12' })
  @Max(12, { message: 'Month must be between 1 and 12' })
  month: number;
}
