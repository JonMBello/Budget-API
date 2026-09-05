# Feature 03: Cuentas y Tarjetas de Crédito (Motor de Ciclos Bancarios)

## 📋 Objetivo
Permitir el registro y administración de cuentas bancarias, efectivo y tarjetas de crédito con sus días de corte y límite de pago. Desarrollar el motor algorítmico de ciclos bancarios que determina la fecha exacta de vencimiento y a qué periodo presupuestario mensual corresponde el desembolso de dinero (flujo de caja).

---

## 👤 Historias de Usuario (HUs)

### HU-03.1: Catálogo y Gestión de Tarjetas y Cuentas
> **Como** usuario,  
> **Quiero** registrar mis tarjetas de crédito (con día de corte y pago), cuentas de débito y efectivo,  
> **Para** asociar mis compras a los métodos de pago reales que utilizo.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/cards` para crear cuenta o tarjeta.
- [x] Permite especificar `name` (ej. "Banorte Platinum"), `type` (`CREDIT`, `DEBIT`, `CASH`), `color`, `last4Digits`, `creditLimit`.
- [x] Para tarjetas de crédito (`type: 'CREDIT'`), `cutoffDay` (1-31) y `paymentDueDay` (1-31) son obligatorios.
- [x] Endpoints para listar (`GET /api/cards`), editar (`PATCH /api/cards/:id`) y desactivar/eliminar (`DELETE /api/cards/:id`).
- [x] Todos los datos están aislados por `userId`.

---

### HU-03.2: Motor de Ciclos Bancarios (Cálculo de Fechas de Corte y Vencimiento)
> **Como** usuario,  
> **Quiero** que el sistema calcule automáticamente la fecha de corte y la fecha límite de pago para cualquier fecha de compra,  
> **Para** saber con certeza cuándo tendré que pagar esa compra al banco.

**Criterios de Aceptación:**
- [x] Si la compra ocurre **en o antes** del `cutoffDay`, pertenece al estado de cuenta del mes en curso.
- [x] Si la compra ocurre **después** del `cutoffDay`, pasa al estado de cuenta del mes siguiente.
- [x] Si el `paymentDueDay` es menor numéricamente que el `cutoffDay` (ej. corta el 15 y paga el 5), la fecha límite de pago cae en el mes calendario posterior al corte.
- [x] Maneja de forma segura meses de 28, 29, 30 y 31 días (ej. si el día de corte es 31 y febrero tiene 28, ajusta al último día del mes).

---

### HU-03.3: Previsualización de Imputación Presupuestaria
> **Como** usuario que planifica una compra,  
> **Quiero** consultar a qué mes presupuestario afectará una compra en una tarjeta específica en una fecha determinada,  
> **Para** decidir en qué momento me conviene realizar la compra o planear mi flujo de efectivo.

**Criterios de Aceptación:**
- [x] Endpoint `GET /api/cards/:id/preview-statement?date=YYYY-MM-DD`.
- [x] Retorna: `statementCutoffDate`, `paymentDueDate`, `impactBudgetYear`, `impactBudgetMonth` y `daysUntilDue`.

---

## 🛠️ Desglose de Tickets Técnicos

- [x] **TICKET-03.1: Esquema Mongoose `AccountCard`**
  - Archivo `src/modules/cards/schemas/account-card.schema.ts`.
  - Campos: `userId`, `name`, `type` (`CREDIT`, `DEBIT`, `CASH`), `cutoffDay`, `paymentDueDay`, `color`, `last4Digits`, `creditLimit`, `isActive`.
  - Índice compuesto `{ userId: 1, isActive: 1 }`.

- [x] **TICKET-03.2: Utilidad Algorítmica `CardCycleUtil`**
  - Archivo `src/common/utils/card-cycle.util.ts`.
  - Función pura: `calculateStatementCycle(purchaseDate, cutoffDay, paymentDueDay)`.
  - Retorna fechas normalizadas UTC/local y periodo presupuestario asignado.

- [x] **TICKET-03.3: DTOs y Validación**
  - `create-card.dto.ts`, `update-card.dto.ts`, `statement-preview.dto.ts`, `card-response.dto.ts`.
  - Validar que si `type === 'CREDIT'`, `cutoffDay` y `paymentDueDay` estén en el rango 1-31.

- [x] **TICKET-03.4: Servicio de Tarjetas (`CardsService`)**
  - Métodos: `create()`, `findAllByUser()`, `findOne()`, `update()`, `remove()`, `previewStatement()`.

- [x] **TICKET-03.5: Controlador y Swagger (`CardsController`)**
  - Endpoints REST `/api/cards` protegidos con el decorador compuesto `@Auth()` (requiere obligatoriamente `x-api-key` y `Authorization: Bearer <token>`).
  - DTOs con validaciones y mensajes en inglés (`class-validator`).
  - Documentación OpenAPI/Swagger con tags correspondientes.

- [x] **TICKET-03.6: Pruebas Unitarias del Motor de Ciclos y Servicio**
  - Archivo `src/common/utils/card-cycle.util.spec.ts` y `src/modules/cards/cards.service.spec.ts`.
  - Casos de prueba:
    - Compra el mismo día de corte.
    - Compra un día después del corte.
    - Transición de año (compra el 20 de diciembre con pago en enero/febrero).
    - Ajuste para meses con menos de 31 días (febrero, abril, etc.).
    - Operaciones CRUD y aislamiento multi-tenant por usuario.

---

## ✅ Verificación de la Feature
1. Crear una tarjeta con corte el día 15 y pago el día 5 enviando `x-api-key` y `Authorization: Bearer <token>`.
2. Consultar el preview con fecha de compra `2026-09-10`:
   - Corte esperado: `2026-09-15`
   - Pago esperado: `2026-10-05`
   - Mes presupuestario impactado: `Octubre 2026`.
3. Consultar el preview con fecha de compra `2026-09-16`:
   - Corte esperado: `2026-10-15`
   - Pago esperado: `2026-11-05`
   - Mes presupuestario impactado: `Noviembre 2026`.
4. Verificar que peticiones sin `x-api-key` o sin JWT respondan `401 Unauthorized` (`Unauthorized request`).
5. Verificar que todas las pruebas unitarias pasen (`npm test`).

