# Budget API 💰

<div align="center">

[![CI](https://github.com/JonMBello/Budget-API/actions/workflows/ci.yml/badge.svg)](https://github.com/JonMBello/Budget-API/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/JonMBello/Budget-API/releases)
[![Tests](https://img.shields.io/badge/tests-191%20passing-brightgreen.svg)](https://github.com/JonMBello/Budget-API)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-85EA2D?logo=swagger&logoColor=black)](https://budget.jonmb.com/api/docs)

**API REST modular, segura y de alto rendimiento para gestión financiera personal, control de presupuestos mensuales, liquidación de compras a Meses Sin Intereses (MSI), división de deudas entre terceros y recordatorios automáticos de pago.**

[Documentación Swagger Interactiva](https://budget.jonmb.com/api/docs) • [Roadmap y Especificaciones](./docs/README.md)

</div>

---

## 🌟 Características Principales

- **🔐 Seguridad Multi-inquilino (Multi-Tenancy):** Autenticación JWT dual (Access Token de 1h + Refresh Token de 7d), encriptación bcrypt, validación global con header `x-api-key`, y control de registro restringido mediante código de invitación (`BUDGET_API_REGISTRATION_INVITE_CODE`).
- **💳 Motor de Ciclos Financieros:** Cálculo automático de fechas de corte y límites de pago para tarjetas de crédito, soportando transacciones post-corte y proyección de flujos de efectivo.
- **🛍️ Motor de Meses Sin Intereses (MSI) y Recurrentes:** Creación de planes diferidos con amortización progresiva (ej. `3/12`), proyección mensual, y cancelación con recálculo automático del remanente.
- **👥 División de Cuentas (Expense Splits) y Deudas:** Registro de compras compartidas divididas entre múltiples personas, seguimiento de saldo deudor pendiente y liquidaciones parciales o totales vinculadas al flujo de caja.
- **📊 Métricas en Tiempo Real y Remanente de Nómina:** Cálculo de gastos fijos vs. variables, porcentaje de ejecución presupuestaria y saldo discrecional disponible tras apartar deudas y compromisos futuros.
- **⏰ Notificaciones Híbridas (Push + Email):** Envío de Web Push (estándar RFC 8292 VAPID) y correos transaccionales (Nodemailer / Resend) con scheduler cron diario a las 08:00 AM para vencimientos próximos y prevención estricta de alertas duplicadas.

---

## 📚 Documentación y Roadmap

La planificación técnica y el desglose de historias de usuario y tickets se encuentran organizados en la carpeta [`docs/`](./docs/README.md):

1. [Feature 01: Setup e Infraestructura](./docs/features/01-setup-and-infrastructure/README.md)
2. [Feature 02: Autenticación y Usuarios (JWT + Invite Code)](./docs/features/02-auth-and-users/README.md)
3. [Feature 03: Cuentas y Tarjetas de Crédito (Motor de Ciclos)](./docs/features/03-cards-and-accounts/README.md)
4. [Feature 04: Personas y Directorio de Deudores](./docs/features/04-people-and-debts/README.md)
5. [Feature 05: Periodos Presupuestarios Mensuales y Ahorro Acarreado](./docs/features/05-budget-periods-and-savings/README.md)
6. [Feature 06: Cargos Recurrentes y Motor de MSI](./docs/features/06-recurring-and-msi/README.md)
7. [Feature 07: Transacciones, Gastos, Ingresos y División de Gastos (Splits)](./docs/features/07-transactions-and-splits/README.md)
8. [Feature 08: Métricas en Tiempo Real y Remanente de Nómina](./docs/features/08-metrics-and-cashflow/README.md)
9. [Feature 09: Notificaciones y Recordatorios (Push + Email + Cron)](./docs/features/09-notifications-and-reminders/README.md)

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Framework** | [NestJS 10](https://nestjs.com/) (Node.js LTS, TypeScript) |
| **Base de Datos** | [MongoDB 7+](https://www.mongodb.com/) con [Mongoose ODM](https://mongoosejs.com/) |
| **Autenticación** | Passport JWT + Bcrypt |
| **Notificaciones** | Web Push (VAPID) + Nodemailer / [Resend](https://resend.com) |
| **Documentación** | OpenAPI 3.0 / Swagger (`/api/docs`) |
| **Proxy / TLS** | [Caddy Server 2](https://caddyserver.com/) (HTTPS automático con Let's Encrypt) |
| **Process Manager**| [PM2](https://pm2.keymetrics.io/) |

---

## 🚀 Inicio Rápido (Local)

### 1. Clonar el repositorio
```bash
git clone https://github.com/JonMBello/Budget-API.git
cd Budget-API
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de Entorno
Copia el archivo de ejemplo y edita tus credenciales:
```bash
cp .env.example .env
```

### 4. Iniciar en Desarrollo
```bash
npm run start:dev
```
La documentación Swagger interactiva estará disponible en: **`http://localhost:3001/api/docs`**

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con un 100% de cobertura en sus suites críticas de lógica financiera:

```bash
# Ejecutar todas las pruebas unitarias (191 tests)
npm test

# Ejecutar pruebas e2e de integración
npm run test:e2e

# Validar linting y formato
npm run lint
```

```text
Test Suites: 25 passed, 25 total
Tests:       191 passed, 191 total
Snapshots:   0 total
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE) - consulta el archivo LICENSE para más detalles.
