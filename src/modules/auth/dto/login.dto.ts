import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'juan@example.com',
    description: 'Correo electrónico de la cuenta',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: 'MiClaveSegura123!',
    description: 'Contraseña de la cuenta',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
