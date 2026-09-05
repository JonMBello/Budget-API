import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Full name or alias of the person',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiPropertyOptional({
    example: '+52',
    description: 'International phone country code (e.g. +52, +1)',
  })
  @IsOptional()
  @IsString({ message: 'Phone code must be a string' })
  phoneCode?: string;

  @ApiPropertyOptional({
    example: '8181234567',
    description: 'Phone number without country code',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiPropertyOptional({
    example: 'juan.perez@example.com',
    description: 'Email address',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({
    example: 'Coworker sharing Netflix and lunch expenses',
    description: 'Additional notes or context regarding this person',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
