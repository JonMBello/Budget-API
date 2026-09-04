import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Decorador compuesto para endpoints o controladores protegidos.
 * - Aplica el guard de autenticación JWT (JwtAuthGuard).
 * - Declara en Swagger OpenAPI el requisito conjunto de 'api-key' y 'JWT-auth'.
 * - Documenta la respuesta 401 (Unauthorized request).
 */
export function Auth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiSecurity({ 'api-key': [], 'JWT-auth': [] }),
    ApiResponse({ status: 401, description: 'Unauthorized request' }),
  );
}
