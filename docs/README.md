# Budget-API: Documentación y Roadmap Incremental

Bienvenido a la documentación de desarrollo de **Budget-API**, una API construida con **NestJS** y **MongoDB** diseñada para la gestión financiera personal, control de presupuestos mensuales, seguimiento de compras a Meses Sin Intereses (MSI), división de deudas con terceros y recordatorios automáticos.

---

## 🗺️ Mapa de Features e Índice de Implementación

El desarrollo se encuentra descompuesto en 9 features secuenciales e incrementales. Cada carpeta contiene sus Historias de Usuario (HU), Criterios de Aceptación y desglose de Tickets técnicos listos para ser implementados:

| # | Feature | Descripción | Estado |
|---|---|---|---|
| **01** | [Setup e Infraestructura](./features/01-setup-and-infrastructure/README.md) | Inicialización de NestJS, Mongoose, Swagger y Caddy. | ✅ Completada |
| **02** | [Autenticación y Usuarios](./features/02-auth-and-users/README.md) | Multi-tenancy por `userId`, JWT (Access/Refresh), registro con Invite Code. | Pendiente |
| **03** | [Cuentas y Tarjetas de Crédito](./features/03-cards-and-accounts/README.md) | Tarjetas con días de corte y pago; motor de fechas de flujo de caja. | Pendiente |
| **04** | [Personas y Cuentas por Cobrar](./features/04-people-and-debts/README.md) | Directorio de deudores, agregación de deudas por persona y liquidación. | Pendiente |
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
