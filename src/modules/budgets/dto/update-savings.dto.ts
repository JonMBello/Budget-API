import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateSavingsDto {
  @ApiProperty({
    example: 4000,
    description: 'Updated carried savings amount transferred into this budget period',
  })
  @IsNotEmpty({ message: 'Carried savings is required' })
  @IsNumber({}, { message: 'Carried savings must be a number' })
  carriedSavings: number;
}
