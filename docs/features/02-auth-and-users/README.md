# Feature 02: Autenticación, Usuarios y Multi-Tenancy

## 📋 Objetivo
Implementar un sistema de autenticación seguro basado en **JWT** (Access Tokens y Refresh Tokens), hashing de contraseñas con `bcrypt`, control de acceso con Guards y aislamiento estricto de datos multi-usuario mediante `userId`. Para proteger el servidor expuesto en internet, el registro estará restringido mediante un código de invitación (`BUDGET_API_REGISTRATION_INVITE_CODE`).

---

## 👤 Historias de Usuario (HUs)

### HU-02.1: Registro Restringido con Código de Invitación
> **Como** usuario legítimo,  
> **Quiero** registrar una cuenta nueva usando mi email, contraseña, nombre y un código de invitación secreto,  
> **Para** crear mi espacio presupuestario personal sin que extraños puedan registrarse en mi VPS.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/auth/register`.
- [x] Valida que el email tenga formato correcto y no esté registrado previamente.
- [x] Valida que la contraseña cumpla con longitud mínima (ej. 8 caracteres).
- [x] Compara el `inviteCode` enviado con la variable de entorno `BUDGET_API_REGISTRATION_INVITE_CODE`. Si no coincide, rechaza con error `403 Forbidden`.
- [x] La contraseña se almacena hasheada con `bcrypt` (mínimo 10 salt rounds).
- [x] Retorna los datos del usuario creado (sin contraseña) y los tokens de sesión.

---

### HU-02.2: Inicio de Sesión y Emisión de Tokens JWT
> **Como** usuario registrado,  
> **Quiero** iniciar sesión con mi email y contraseña,  
> **Para** obtener credenciales de acceso seguras para consultar mi información.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/auth/login`.
- [x] Valida credenciales contra MongoDB.
- [x] Emite un `accessToken` con tiempo de expiración corto (ej. 15 a 60 minutos) y un `refreshToken` de larga duración (ej. 7 a 30 días).
- [x] El payload del token incluye `sub` (`userId`) y `email`.

---

### HU-02.3: Renovación de Token (Refresh Token)
> **Como** cliente web/PWA,  
> **Quiero** enviar mi refresh token válido para obtener un nuevo access token,  
> **Para** mantener mi sesión abierta en mis dispositivos sin pedir re-autenticación constante.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/auth/refresh`.
- [x] Valida la firma y vigencia del refresh token.
- [x] Retorna un nuevo par de tokens (`accessToken`, `refreshToken`).

---

### HU-02.4: Perfil de Usuario y Decorador Compuesto `@Auth`
> **Como** usuario autenticado,  
> **Quiero** consultar y actualizar mi perfil (nombre, moneda principal MXN/USD),  
> **Para** personalizar mi experiencia y verificar el estado de mi cuenta.

**Criterios de Aceptación:**
- [x] Decorador compuesto `@Auth()` (`src/common/decorators/auth.decorator.ts`) que combina `JwtAuthGuard`, OpenAPI security (`api-key` + `JWT-auth`) y documentación de respuesta 401.
- [x] Endpoint `GET /api/users/me` protegido con `@Auth()`.
- [x] Endpoint `PATCH /api/users/me` protegido con `@Auth()` para actualizar nombre o divisa base.
- [x] Decorador personalizado `@CurrentUser()` para inyectar los datos del usuario autenticado en los controladores.
- [x] Respuestas de error estandarizadas en inglés y discretas ante fallos de autorización (`401 Unauthorized` -> `Unauthorized request`).

---

## 🛠️ Desglose de Tickets Técnicos

- [x] **TICKET-02.1: Esquema Mongoose de Usuario (`User`)**
  - Archivo `src/modules/users/schemas/user.schema.ts`.
  - Campos: `email` (único, lowercase, index), `passwordHash`, `name`, `currency` (enum `MXN`, `USD`, default: `MXN`), `isActive`, `refreshTokenHash` (opcional), `createdAt`, `updatedAt`.
  - Índices de base de datos adecuados.

- [x] **TICKET-02.2: DTOs y Validaciones de Autenticación con Mensajes en Inglés**
  - Archivos: `register.dto.ts`, `login.dto.ts`, `refresh-token.dto.ts`, `update-user.dto.ts`.
  - Anotaciones de Swagger (`@ApiProperty`) y `class-validator` con mensajes de error en inglés (`Invalid email address`, `Password must be at least 8 characters long`, etc.).

- [x] **TICKET-02.3: Servicio de Autenticación (`AuthService`)**
  - Métodos: `register()`, `login()`, `refreshTokens()`, `validateUser()`.
  - Comparación de `inviteCode` con `ConfigService` (`Invalid invite code`).
  - Hashing seguro con `bcrypt`.
  - Respuestas discretas en tokens inválidos o revocados (`Unauthorized request`).

- [x] **TICKET-02.4: Estrategia JWT, Guards y Decorador Compuesto `@Auth()`**
  - Implementar `JwtStrategy` con `@nestjs/passport` y `passport-jwt`.
  - Crear `JwtAuthGuard` con sobreescritura de `handleRequest` para responder discretamente `Unauthorized request`.
  - Crear decorador `@Auth()` combinando `UseGuards(JwtAuthGuard)`, `ApiSecurity({ 'api-key': [], 'JWT-auth': [] })` y `ApiResponse(401)`.
  - Decorador `@Public()` para excluir rutas públicas de la autenticación JWT (pero conservando `ApiKeyGuard`).
  - Decorador `@CurrentUser()` para extraer el usuario autenticado desde `request.user`.

- [x] **TICKET-02.5: Controlador de Auth (`AuthController`)**
  - Endpoints (requieren `x-api-key`):
    - `POST /api/auth/register`
    - `POST /api/auth/login`
    - `POST /api/auth/refresh`
  - Documentación Swagger completa con respuestas 200, 400, 401 y 403.

- [x] **TICKET-02.6: Módulo de Usuarios (`UsersModule`)**
  - Endpoints en `UsersController` (protegidos con `@Auth()`, requieren `x-api-key` y `Authorization: Bearer <token>`):
    - `GET /api/users/me`
    - `PATCH /api/users/me`
  - Métodos en `UsersService`: `findById()`, `findByEmail()`, `update()`.

- [x] **TICKET-02.7: Pruebas Unitarias y E2E**
  - Unit tests para `AuthService`, `UsersService`, `ApiKeyGuard` y `JwtAuthGuard`.
  - E2E tests verificando rechazo 401 sin `x-api-key` y éxito 200 con `x-api-key`.

---

## ✅ Verificación de la Feature
1. Intentar registrar un usuario sin `x-api-key` -> Debe responder `401 Unauthorized` (`Unauthorized request`).
2. Intentar registrar con `x-api-key` y un `inviteCode` erróneo -> Debe responder `403 Forbidden` (`Invalid invite code`).
3. Registrar un usuario con el `inviteCode` correcto -> Retorna usuario y tokens (`201 Created`).
4. Hacer login con las credenciales creadas -> Retorna tokens (`200 OK`).
5. Invocar `GET /api/users/me` con `x-api-key` y `Authorization: Bearer <token>` -> Devuelve perfil del usuario (`200 OK`).
6. Invocar `GET /api/users/me` sin token o con token expirado -> Debe responder `401 Unauthorized` (`Unauthorized request`).

