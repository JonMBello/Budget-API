import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateIncomeDto {
  @ApiProperty({
    example: 25000,
    description: 'Updated total monthly income / earnings for this budget period',
  })
  @IsNotEmpty({ message: 'Total income is required' })
  @IsNumber({}, { message: 'Total income must be a number' })
  @Min(0, { message: 'Total income must be at least 0' })
  totalIncome: number;
}
