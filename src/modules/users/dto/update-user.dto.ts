import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Currency } from '../schemas/user.schema';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Juan Carlos Pérez',
    description: 'Nombre actualizado del usuario',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @ApiPropertyOptional({
    enum: Currency,
    example: Currency.MXN,
    description: 'Moneda base para los presupuestos',
  })
  @IsOptional()
  @IsEnum(Currency, { message: 'Currency must be either MXN or USD' })
  currency?: Currency;
}
