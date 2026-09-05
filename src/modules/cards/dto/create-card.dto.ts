import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { AccountCardType } from '../../../common/utils/card-cycle.util';

export class CreateCardDto {
  @ApiProperty({
    example: 'BBVA Platinum',
    description: 'Name or alias of the card or account',
  })
  @IsString()
  @IsNotEmpty({ message: 'Card name is required' })
  name: string;

  @ApiProperty({
    enum: AccountCardType,
    default: AccountCardType.CREDIT,
    example: AccountCardType.CREDIT,
    description: 'Account type (CREDIT, DEBIT, CASH)',
  })
  @IsEnum(AccountCardType, { message: 'Type must be CREDIT, DEBIT, or CASH' })
  type: AccountCardType;

  @ApiPropertyOptional({
    example: 15,
    minimum: 1,
    maximum: 31,
    description: 'Monthly statement cutoff day (1-31). Required for CREDIT cards.',
  })
  @IsOptional()
  @IsInt({ message: 'Cutoff day must be an integer' })
  @Min(1, { message: 'Cutoff day must be between 1 and 31' })
  @Max(31, { message: 'Cutoff day must be between 1 and 31' })
  cutoffDay?: number;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 31,
    description: 'Monthly payment due day (1-31). Required for CREDIT cards.',
  })
  @IsOptional()
  @IsInt({ message: 'Payment due day must be an integer' })
  @Min(1, { message: 'Payment due day must be between 1 and 31' })
  @Max(31, { message: 'Payment due day must be between 1 and 31' })
  paymentDueDay?: number;

  @ApiPropertyOptional({
    example: '#1E88E5',
    description: 'Hex color code or identifier for visual representation',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: '1234',
    description: 'Last 4 digits of the card number',
  })
  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'last4Digits must be exactly 4 characters' })
  last4Digits?: string;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Total credit limit assigned by the bank',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Credit limit must be a number' })
  @Min(0, { message: 'Credit limit cannot be negative' })
  creditLimit?: number;
}
