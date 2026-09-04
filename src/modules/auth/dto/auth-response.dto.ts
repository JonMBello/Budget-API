import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../../users/schemas/user.schema';

export class UserProfileResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  id: string;

  @ApiProperty({ example: 'juan@example.com' })
  email: string;

  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  @ApiProperty({ enum: Currency, example: Currency.MXN })
  currency: Currency;

  @ApiProperty({ example: '2026-09-04T01:00:00.000Z' })
  createdAt?: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Access Token de corta duración (ej. 1h)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Refresh Token de larga duración (ej. 7d)',
  })
  refreshToken: string;

  @ApiProperty({ type: UserProfileResponseDto })
  user: UserProfileResponseDto;
}
