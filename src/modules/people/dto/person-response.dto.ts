import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonResponseDto {
  @ApiProperty({ example: '654321654321654321654321' })
  id: string;

  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  @ApiPropertyOptional({ example: '+52' })
  phoneCode?: string | null;

  @ApiPropertyOptional({ example: '8181234567' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'juan.perez@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ example: 'Coworker sharing Netflix and lunch expenses' })
  notes?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-09-04T08:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-09-04T08:00:00.000Z' })
  updatedAt?: Date;
}
