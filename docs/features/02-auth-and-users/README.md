# Feature 02: Autenticación, Usuarios y Multi-Tenancy

## 📋 Objetivo
Implementar un sistema de autenticación seguro basado en **JWT** (Access Tokens y Refresh Tokens), hashing de contraseñas con `bcrypt`, control de acceso con Guards y aislamiento estricto de datos multi-usuario mediante `userId`. Para proteger el servidor expuesto en internet, el registro estará restringido mediante un código de invitación (`REGISTRATION_INVITE_CODE`).

---

## 👤 Historias de Usuario (HUs)

### HU-02.1: Registro Restringido con Código de Invitación
> **Como** usuario legítimo,  
> **Quiero** registrar una cuenta nueva usando mi email, contraseña, nombre y un código de invitación secreto,  
> **Para** crear mi espacio presupuestario personal sin que extraños puedan registrarse en mi VPS.

**Criterios de Aceptación:**
- [ ] Endpoint `POST /api/auth/register`.
- [ ] Valida que el email tenga formato correcto y no esté registrado previamente.
- [ ] Valida que la contraseña cumpla con longitud mínima (ej. 8 caracteres).
- [ ] Compara el `inviteCode` enviado con la variable de entorno `REGISTRATION_INVITE_CODE`. Si no coincide, rechaza con error `403 Forbidden`.
- [ ] La contraseña se almacena hasheada con `bcrypt` (mínimo 10 salt rounds).
- [ ] Retorna los datos del usuario creado (sin contraseña) y los tokens de sesión.

---

### HU-02.2: Inicio de Sesión y Emisión de Tokens JWT
> **Como** usuario registrado,  
> **Quiero** iniciar sesión con mi email y contraseña,  
> **Para** obtener credenciales de acceso seguras para consultar mi información.

**Criterios de Aceptación:**
- [ ] Endpoint `POST /api/auth/login`.
- [ ] Valida credenciales contra MongoDB.
- [ ] Emite un `accessToken` con tiempo de expiración corto (ej. 15 a 60 minutos) y un `refreshToken` de larga duración (ej. 7 a 30 días).
- [ ] El payload del token incluye `sub` (`userId`) y `email`.

---

### HU-02.3: Renovación de Token (Refresh Token)
> **Como** cliente web/PWA,  
> **Quiero** enviar mi refresh token válido para obtener un nuevo access token,  
> **Para** mantener mi sesión abierta en mis dispositivos sin pedir re-autenticación constante.

**Criterios de Aceptación:**
- [ ] Endpoint `POST /api/auth/refresh`.
- [ ] Valida la firma y vigencia del refresh token.
- [ ] Retorna un nuevo par de tokens (`accessToken`, `refreshToken`).

---

### HU-02.4: Perfil de Usuario y Decorador `@CurrentUser`
> **Como** usuario autenticado,  
> **Quiero** consultar y actualizar mi perfil (nombre, moneda principal MXN/USD),  
> **Para** personalizar mi experiencia y verificar el estado de mi cuenta.

**Criterios de Aceptación:**
- [ ] Endpoint `GET /api/users/me` protegido con `JwtAuthGuard`.
- [ ] Endpoint `PATCH /api/users/me` para actualizar nombre o divisa base.
- [ ] Decorador personalizado `@CurrentUser()` para inyectar los datos del usuario autenticado en los controladores.

---

## 🛠️ Desglose de Tickets Técnicos

- [ ] **TICKET-02.1: Esquema Mongoose de Usuario (`User`)**
  - Archivo `src/modules/users/schemas/user.schema.ts`.
  - Campos: `email` (único, lowercase, index), `passwordHash`, `name`, `currency` (enum `MXN`, `USD`, default: `MXN`), `isActive`, `refreshTokenHash` (opcional), `createdAt`, `updatedAt`.
  - Índices de base de datos adecuados.

- [ ] **TICKET-02.2: DTOs y Validaciones de Autenticación**
  - Archivos: `register.dto.ts`, `login.dto.ts`, `refresh-token.dto.ts`, `update-user.dto.ts`.
  - Anotaciones de Swagger (`@ApiProperty`) y `class-validator` (`@IsEmail`, `@MinLength`, etc.).

- [ ] **TICKET-02.3: Servicio de Autenticación (`AuthService`)**
  - Métodos: `register()`, `login()`, `refreshTokens()`, `validateUser()`.
  - Lógica de comparación de `inviteCode` con `ConfigService`.
  - Hashing seguro con `bcrypt`.

- [ ] **TICKET-02.4: Estrategia JWT y Guards**
  - Implementar `JwtStrategy` con `@nestjs/passport` y `passport-jwt`.
  - Crear `JwtAuthGuard` y definirlo como Guard global o modular.
  - Decorador `@Public()` con `SetMetadata` para excluir rutas públicas (login, register).
  - Decorador `@CurrentUser()` para extraer el usuario desde `request.user`.

- [ ] **TICKET-02.5: Controlador de Auth (`AuthController`)**
  - Endpoints:
    - `POST /api/auth/register`
    - `POST /api/auth/login`
    - `POST /api/auth/refresh`
  - Documentación Swagger completa con respuestas 200, 400, 401 y 403.

- [ ] **TICKET-02.6: Módulo de Usuarios (`UsersModule`)**
  - Endpoints en `UsersController`:
    - `GET /api/users/me`
    - `PATCH /api/users/me`
  - Métodos en `UsersService`: `findById()`, `findByEmail()`, `update()`.

- [ ] **TICKET-02.7: Pruebas Unitarias**
  - Unit tests para `AuthService` (validación de contraseñas incorrectas, rechazo de código de invitación inválido, generación de tokens).

---

## ✅ Verificación de la Feature
1. Intentar registrar un usuario con un `inviteCode` erróneo -> Debe responder `403 Forbidden`.
2. Registrar un usuario con el `inviteCode` correcto definido en `.env` -> Retorna usuario y tokens (`201 Created`).
3. Hacer login con las credenciales creadas -> Retorna tokens (`200 OK`).
4. Invocar `GET /api/users/me` con el Header `Authorization: Bearer <token>` -> Devuelve perfil del usuario.
5. Invocar `GET /api/users/me` sin token o con token expirado -> Debe responder `401 Unauthorized`.
