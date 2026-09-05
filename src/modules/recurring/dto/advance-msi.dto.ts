import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdvanceMsiDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'Number of installments to advance or pay ahead of time',
  })
  @IsOptional()
  @IsInt({ message: 'Installments count must be an integer' })
  @Min(1, { message: 'Must advance at least 1 installment' })
  installmentsCount?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Set to true to pay off and finalize the entire remaining balance of this MSI plan',
  })
  @IsOptional()
  @IsBoolean({ message: 'payAll must be a boolean' })
  payAll?: boolean;

  @ApiPropertyOptional({
    example: 'Paid remaining balance with annual bonus',
    description: 'Optional note regarding the advance payment',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
