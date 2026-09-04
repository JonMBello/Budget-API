# Feature 01: Setup, Arquitectura e Infraestructura

## 📋 Objetivo
Establecer los cimientos del proyecto creando la estructura base de NestJS con TypeScript, integración con MongoDB (Mongoose), validación de variables de entorno, documentación OpenAPI/Swagger bajo `/api/docs`, contenedor Docker multi-stage y configuración de Caddy para el subdominio `budget.jonmb.com/api`.

---

## 👤 Historias de Usuario (HUs)

### HU-01.1: Inicialización y Configuración del Entorno
> **Como** desarrollador,  
> **Quiero** tener un proyecto NestJS estructurado con validación estricta de variables de entorno y formato de código,  
> **Para** garantizar consistencia y prevenir errores de configuración en tiempo de ejecución.

**Criterios de Aceptación:**
- [x] Proyecto NestJS inicializado con `npm` y TypeScript estricto.
- [x] Módulo `@nestjs/config` configurado con validación (usando `joi` o `zod`) para variables obligatorias: `BUDGET_API_PORT`, `BUDGET_API_NODE_ENV`, `BUDGET_API_KEY`, `BUDGET_API_MONGO_URI`, `BUDGET_API_JWT_SECRET`, `BUDGET_API_REGISTRATION_INVITE_CODE`.
- [x] Archivos `.env.example` y `.env` documentados con prefijo `BUDGET_API_`.
- [x] Formateo con ESLint y Prettier verificado.

---

### HU-01.2: Conexión a MongoDB con Mongoose
> **Como** API,  
> **Quiero** conectarme de forma asíncrona a la base de datos MongoDB especificada por variable de entorno,  
> **Para** persistir y consultar datos con manejo adecuado de reconexión y logs de error.

**Criterios de Aceptación:**
- [x] Mongoose integrado mediante `@nestjs/mongoose`.
- [x] Conexión parametrizada vía `BUDGET_API_MONGO_URI`.
- [x] Manejo de eventos de conexión (`connected`, `error`, `disconnected`) con logs informativos.
- [x] Manejo de desconexión elegante (*graceful shutdown*) al detener la aplicación.

---

### HU-01.3: Prefijo Global, Validaciones, API Key Guard y Swagger
> **Como** consumidor de la API o frontend PWA,  
> **Quiero** acceder a los endpoints bajo el prefijo `/api`, enviar obligatoriamente el header `x-api-key`, y consultar la documentación interactiva en `/api/docs`,  
> **Para** asegurar las peticiones y entender claramente los contratos de datos y verificar los endpoints.

**Criterios de Aceptación:**
- [x] Prefijo global `/api` activo en todas las rutas.
- [x] `ApiKeyGuard` global (`APP_GUARD`) que exige el header `x-api-key: <BUDGET_API_KEY>` en absolutamente todas las peticiones (públicas y privadas).
- [x] `HttpLoggerMiddleware` global que registra en consola cada petición entrante y su respuesta con status code y duración (`+Xms`).
- [x] Swagger montado en `/api/docs` con esquemas `api-key` y `JWT-auth`, y persistencia de autorización (`persistAuthorization: true`).
- [x] `ValidationPipe` global activo con `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`.
- [x] Filtro global de excepciones `HttpExceptionFilter` para estandarizar respuestas de error JSON (`statusCode`, `error`, `message`, `timestamp`, `path`) con mensajes de error estrictamente en inglés y respuestas discretas para 401 (`Unauthorized request`).

---

### HU-01.4: Configuración de Caddy y Despliegue en VPS
> **Como** administrador del VPS,  
> **Quiero** ejecutar la API nativamente en Node.js y disponer de la configuración para Caddy,  
> **Para** servir de forma segura y automatizada la API en `budget.jonmb.com/api`.

**Criterios de Aceptación:**
- [x] Scripts de compilación y ejecución de producción (`npm run build`, `npm run start:prod`).
- [x] Archivo o guía `Caddyfile` con la regla de proxy inverso hacia el proceso local de NestJS.

---

## 🛠️ Desglose de Tickets Técnicos

- [x] **TICKET-01.1: Inicialización de NestJS y dependencias core**
  - Instalar dependencias: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/mongoose`, `mongoose`, `@nestjs/swagger`, `class-validator`, `class-transformer`.
  - Configurar `tsconfig.json` y scripts en `package.json` (`start:dev`, `build`, `test`).

- [x] **TICKET-01.2: ConfigModule y validación de variables de entorno**
  - Crear `src/config/env.validation.ts` con esquema de validación para `BUDGET_API_PORT`, `BUDGET_API_KEY`, `BUDGET_API_MONGO_URI`, `BUDGET_API_JWT_SECRET`, etc.
  - Generar `.env.example` con descripciones de cada variable.

- [x] **TICKET-01.3: Módulo de Base de Datos (MongooseModule)**
  - Configurar `MongooseModule.forRootAsync` en `AppModule` consumiendo `ConfigService`.
  - Probar conexión a MongoDB local o remoto.

- [x] **TICKET-01.4: Configuración de Main (`main.ts`), Filtros y Guards Globales**
  - Establecer `app.setGlobalPrefix('api')`.
  - Añadir `app.useGlobalPipes(new ValidationPipe({ ... }))`.
  - Crear `src/common/guards/api-key.guard.ts` y registrarlo como primer `APP_GUARD`.
  - Crear `src/common/middleware/http-logger.middleware.ts` para loggear peticiones y respuestas con tiempo.
  - Crear `src/common/filters/http-exception.filter.ts` e instanciarlo globalmente con formato estandarizado.

- [x] **TICKET-01.5: Configuración de Swagger OpenAPI**
  - Configurar `DocumentBuilder` con `addApiKey` (`x-api-key`), `addBearerAuth` (`JWT-auth`) y `addSecurityRequirements('api-key')`.
  - Habilitar `persistAuthorization: true` en `SwaggerModule.setup`.
  - Servir la documentación en `/api/docs`.

- [x] **TICKET-01.6: Configuración de Compilación y Ejecución de Producción**
  - Configurar `tsconfig.build.json` y script `npm run start:prod`.

- [x] **TICKET-01.7: Documentación de despliegue con Caddy**
  - Crear snippet de `Caddyfile` en `docs/caddy-sample.Caddyfile`.

---

## ✅ Verificación de la Feature
1. Ejecutar `npm run start:dev` y comprobar que la API levanta sin errores.
2. Probar una petición sin `x-api-key` -> Debe responder `401 Unauthorized` con mensaje `Unauthorized request`.
3. Probar una petición con `x-api-key: <BUDGET_API_KEY>` a `/api/health` -> Debe responder `200 OK`.
4. Navegar a `http://localhost:3001/api/docs` y verificar la interfaz de Swagger con los esquemas de autorización.
5. Ejecutar `npm test` y `npm run test:e2e` para comprobar que todas las pruebas pasen.

