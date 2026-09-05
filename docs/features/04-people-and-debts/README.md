# Feature 04: Personas y Directorio de Deudores

## 📋 Objetivo
Gestionar el directorio de personas con quienes se comparten gastos o a quienes se les presta la tarjeta de crédito. Proporcionar consultas agregadas del total que cada persona debe en tiempo real (sumando compras a MSI pendientes, servicios recurrentes compartidos y compras normales), indicando su fecha máxima de pago según el vencimiento de la tarjeta.

---

## 👤 Historias de Usuario (HUs)

### HU-04.1: Directorio de Personas
> **Como** usuario,  
> **Quiero** registrar personas (nombre, teléfono, notas) con quienes suelo dividir gastos o a quienes les presto mi tarjeta,  
> **Para** vincularlas con compras y llevar el control ordenado de cada una.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/people` para crear persona.
- [x] Endpoints para listar (`GET /api/people`), consultar (`GET /api/people/:id`), editar (`PATCH /api/people/:id`) y desactivar (`DELETE /api/people/:id`).
- [x] Filtrado estricto por `userId`.

---

### HU-04.2: Resumen de Deuda Agregada por Persona
> **Como** usuario,  
> **Quiero** consultar a una persona y ver el monto total acumulado que me debe,  
> **Para** saber exactamente cuánto cobrarle en total y por qué conceptos (MSI, servicios o gastos puntuales), junto con su fecha máxima de pago.

**Criterios de Aceptación:**
- [x] Endpoint `GET /api/people/:id/debts`.
- [x] Desglosa la deuda en tres secciones:
  1. **Cuotas de MSI:** Compras a meses activas donde la persona tiene cuotas restantes, con el desglose de cuota actual y total restante.
  2. **Servicios y Suscripciones:** División de cargos recurrentes del mes activo no liquidados.
  3. **Compras Normales / Puntuales:** Gastos divididos pendientes de cobro.
- [x] Muestra el **Total Adeudado Global** y el **Monto por Pagar en el Periodo Inmediato**.
- [x] Muestra la **Fecha Límite Próxima de Pago** (heredada de la fecha de pago de la tarjeta bancaria correspondiente).

---

### HU-04.3: Registro de Cobro y Liquidación de Deudas
> **Como** usuario,  
> **Quiero** registrar cuando una persona me paga parte o la totalidad de su deuda,  
> **Para** actualizar su saldo pendiente y reflejar el cobro como recibido en mi flujo de ingresos.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/people/:id/settle`.
- [x] Permite marcar como pagada una cuota o gasto específico, o registrar un abono general.
- [x] Al liquidar, actualiza el estado del ingreso correspondiente en el mes presupuestario a `isReceived: true`.

---

## 🛠️ Desglose de Tickets Técnicos

- [x] **TICKET-04.1: Esquema Mongoose `Person`**
  - Archivo `src/modules/people/schemas/person.schema.ts`.
  - Campos: `userId`, `name`, `phoneCode`, `phone`, `email`, `notes`, `isActive`.
  - Índices: `{ userId: 1, name: 1 }`.

- [x] **TICKET-04.2: DTOs de Personas y Liquidación**
  - `create-person.dto.ts`, `update-person.dto.ts`, `settle-debt.dto.ts`.

- [x] **TICKET-04.3: Lógica de Agregación de Deudas en `PeopleService`**
  - Query o pipeline de agregación que combina deudas de:
    - `RecurringTemplate` (tipo MSI con `personId` y cuotas restantes pendientes).
    - `Expense` (con `split.personId` y `split.isPaid: false`).
  - Cálculo de la fecha límite más próxima basándose en `AccountCard.paymentDueDay`.

- [x] **TICKET-04.4: Controlador `PeopleController`**
  - Implementar endpoints REST documentados en Swagger con sus modelos de respuesta tipados.

- [x] **TICKET-04.5: Pruebas Unitarias**
  - Validar cálculo correcto de deuda agregada combinando MSI y gastos comunes.

---

## ✅ Verificación de la Feature
1. Crear una persona "Juan Pérez".
2. Consultar `GET /api/people/:id/debts` -> Debe retornar saldo en \$0 inicialmente.
3. Vincular posteriormente una compra dividida y verificar que el total se actualice en tiempo real con la fecha de pago calculada de la tarjeta.
