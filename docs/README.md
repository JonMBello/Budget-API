# Budget-API: Documentación y Roadmap Incremental

Bienvenido a la documentación de desarrollo de **Budget-API**, una API construida con **NestJS** y **MongoDB** diseñada para la gestión financiera personal, control de presupuestos mensuales, seguimiento de compras a Meses Sin Intereses (MSI), división de deudas con terceros y recordatorios automáticos.

---

## 🗺️ Mapa de Features e Índice de Implementación

El desarrollo se encuentra descompuesto en 9 features secuenciales e incrementales. Cada carpeta contiene sus Historias de Usuario (HU), Criterios de Aceptación y desglose de Tickets técnicos listos para ser implementados:

| # | Feature | Descripción | Estado |
|---|---|---|---|
| **01** | [Setup e Infraestructura](./features/01-setup-and-infrastructure/README.md) | Inicialización de NestJS, Mongoose, Swagger y Caddy. | ✅ Completada |
| **02** | [Autenticación y Usuarios](./features/02-auth-and-users/README.md) | Multi-tenancy por `userId`, JWT (Access/Refresh), registro con Invite Code. | ✅ Completada |
| **03** | [Cuentas y Tarjetas de Crédito](./features/03-cards-and-accounts/README.md) | Tarjetas con días de corte y pago; motor de fechas de flujo de caja. | ✅ Completada |
| **04** | [Personas y Cuentas por Cobrar](./features/04-people-and-debts/README.md) | Directorio de deudores, agregación de deudas por persona y liquidación. | ✅ Completada |
| **05** | [Periodos Presupuestarios y Ahorro](./features/05-budget-periods-and-savings/README.md) | Ciclo de meses explícitos, clonación de plantillas y acarreo de ahorro editable. | Pendiente |
| **06** | [Cargos Recurrentes y Motor de MSI](./features/06-recurring-and-msi/README.md) | Plantillas de servicios, suscripciones y compras a MSI con cuotas automáticas. | Pendiente |
| **07** | [Transacciones, Gastos y Splits](./features/07-transactions-and-splits/README.md) | CRUD de ingresos y egresos, división de gastos con terceros e ingresos proyectados. | Pendiente |
| **08** | [Métricas y Remanente de Nómina](./features/08-metrics-and-cashflow/README.md) | Balance en tiempo real, remanente de nómina disponible para compras personales. | Pendiente |
| **09** | [Notificaciones y Recordatorios](./features/09-notifications-and-reminders/README.md) | Web Push (VAPID) para PWA, email y cron diario de alertas de vencimiento. | Pendiente |

---

## 📐 Estructura de Cada Feature

Cada carpeta dentro de `docs/features/` sigue un estándar riguroso:
1. **Objetivo de la Feature:** Qué problema de negocio resuelve.
2. **Historias de Usuario (HUs):** En formato estándar (*"Como [rol] quiero [acción] para [beneficio]"*) con Criterios de Aceptación detallados.
3. **Tickets Técnicos:** Lista de tareas incrementales con checklists (`- [ ]`), especificando endpoints, schemas DTO, lógica de servicio y pruebas requeridas.
4. **Verificación y Pruebas:** Guía para validar la feature antes de avanzar a la siguiente.

---

## 🔐 Guía de Integración para el Frontend (PWA Client)

Para el desarrollo del frontend web / PWA (`budget.jonmb.com`), deben considerarse las siguientes reglas globales de comunicación:

### 1. API Key Obligatoria (`x-api-key`)
**Todas** las peticiones HTTP que salgan desde el frontend hacia la API (sin excepción, incluyendo `/api/health` y `/api/auth/*`) **deben incluir la cabecera `x-api-key`**:
```http
x-api-key: <BUDGET_API_KEY>
```
*Si este encabezado no se envía o el valor no coincide con el configurado en el servidor, la API rechazará inmediatamente la petición con un error `401 Unauthorized`.*

### 2. Autenticación y Autorización (JWT)
- **Endpoints Públicos** (`/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/health`):
  - Solo requieren el header `x-api-key`.
- **Endpoints Protegidos** (`/api/users/*`, `/api/cards/*`, etc.):
  - Requieren **ambos** encabezados:
    ```http
    x-api-key: <BUDGET_API_KEY>
    Authorization: Bearer <accessToken>
    ```

### 3. Manejo de Errores y Estandarización
- **Idioma:** Todos los mensajes de error devueltos por la API están redactados en **inglés**.
- **Respuestas Discretas para Autenticación (401):**
  Cualquier fallo por falta de API Key, token ausente, expirado, firma inválida o refresh token revocado responderá de forma estandarizada y discreta:
  ```json
  {
    "statusCode": 401,
    "error": "Unauthorized",
    "message": "Unauthorized request",
    "timestamp": "2026-09-04T08:15:50.743Z",
    "path": "/api/users/me"
  }
  ```
- **Errores de Validación de Formularios (400 Bad Request):**
  Devuelven un arreglo con los campos inválidos en inglés:
  ```json
  {
    "statusCode": 400,
    "error": "BadRequestException",
    "message": [
      "Invalid email address",
      "Password must be at least 8 characters long"
    ],
    "timestamp": "2026-09-04T08:15:50.743Z",
    "path": "/api/auth/register"
  }
  ```

### 4. Ejemplo de Cliente HTTP para el Frontend (Axios)
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://budget.jonmb.com/api',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_API_KEY, // API Key global del cliente
  },
});

// Interceptor para inyectar Access Token si el usuario ha iniciado sesión
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para renovar automáticamente el Access Token en 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken },
            { headers: { 'x-api-key': import.meta.env.VITE_API_KEY } }
          );
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          // Sesión caducada, redirigir al login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

