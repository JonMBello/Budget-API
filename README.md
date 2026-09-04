# Budget API 💰

API robusta y escalable construida con **NestJS** y **MongoDB (Mongoose)** para la gestión financiera personal, control de presupuestos mensuales, automatización de compras a Meses Sin Intereses (MSI), división de deudas con terceros y recordatorios de fechas de pago para alimentar una aplicación web PWA en `budget.jonmb.com`.

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

## 🚀 Stack Tecnológico

- **Backend:** [NestJS](https://nestjs.com/) (TypeScript)
- **Base de Datos:** [MongoDB](https://www.mongodb.com/) con [Mongoose](https://mongoosejs.com/)
- **Documentación:** Swagger / OpenAPI (`/api/docs`)
- **Proxy Inverso:** [Caddy](https://caddyserver.com/)
- **Contenedores:** Docker (Multi-stage build)
