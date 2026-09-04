import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Currency } from '../../users/schemas/user.schema';

export class RegisterDto {
  @ApiProperty({
    example: 'juan@example.com',
    description: 'Correo electrónico único del usuario',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: 'MiClaveSegura123!',
    description: 'Contraseña de la cuenta (mínimo 8 caracteres)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo o de preferencia del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({
    example: 'BUDGET_VIP_2026',
    description: 'Código de invitación requerido para registrarse en el servidor',
  })
  @IsString()
  @IsNotEmpty({ message: 'Invite code is required' })
  inviteCode: string;

  @ApiPropertyOptional({
    enum: Currency,
    default: Currency.MXN,
    description: 'Moneda principal para los presupuestos',
  })
  @IsOptional()
  @IsEnum(Currency, { message: 'Currency must be either MXN or USD' })
  currency?: Currency;
}
