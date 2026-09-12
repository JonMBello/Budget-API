# Feature 06: Cargos Recurrentes y Motor de Meses Sin Intereses (MSI)

## 📋 Objetivo
Administrar las plantillas de pagos recurrentes que no tienen fecha de fin estimada (suscripciones de streaming, servicios como agua, luz, internet) y compras a **Meses Sin Intereses (MSI)** con ciclo definido. El motor automatiza la progresión de cuotas (ej. 3 de 12), su auto-finalización al cumplir el plazo y la posibilidad de cancelación o liquidación anticipada.

---

## 👤 Historias de Usuario (HUs)

### HU-06.1: Registro de Suscripciones y Servicios Recurrentes
> **Como** usuario,  
> **Quiero** dar de alta servicios (agua, luz, internet) y suscripciones (Netflix, Spotify, iCloud) que no tienen fecha de fin estimada,  
> **Para** que se incluyan automáticamente en mis presupuestos mensuales futuros sin tener que reescribirlos cada mes.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/recurring` con `type: 'SUBSCRIPTION'` o `'SERVICE'`.
- [x] Permite asociar una tarjeta (`cardId`), categoría, moneda (`MXN`/`USD`) y monto estimado o base.
- [x] Opcionalmente permite asociar división con una persona (`personId`, `splitType`, `splitValue`).
- [x] Permite editar montos de la plantilla y pausar/cancelar la recurrencia (`isActive: false`).

---

### HU-06.2: Motor de Compras a Meses Sin Intereses (MSI)
> **Como** usuario,  
> **Quiero** registrar compras realizadas a meses sin intereses (ej. Laptop a 12 MSI de \$1,500/mes) indicando el plazo total y la cuota inicial,  
> **Para** que la API trackee el avance de cuotas mes con mes y las finalice automáticamente al completar el ciclo.

**Criterios de Aceptación:**
- [x] Registro de MSI con `type: 'MSI'`, `totalAmount`, `totalInstallments` (ej. 12), `currentInstallment` (ej. 1) y `monthlyAmount` (`totalAmount / totalInstallments`).
- [x] Al inicializar un nuevo mes presupuestario:
  - Si `currentInstallment < totalInstallments`, genera el gasto del mes con título ej. *"Laptop (Cuota 2/12)"* e incrementa el contador.
  - Al generar la cuota final (ej. 12 de 12), el plan se marca automáticamente como completado (`isCompleted: true`, `isActive: false`) y deja de instanciarse en meses subsecuentes.

---

### HU-06.3: Liquidación o Cancelación Anticipada de MSI
> **Como** usuario,  
> **Quiero** poder adelantar cuotas o liquidar/cancelar por completo un plan a MSI antes de que termine su plazo natural,  
> **Para** reflejar la realidad si decidí pagar la tarjeta antes de tiempo o devolví el producto.

**Criterios de Aceptación:**
- [x] Endpoint `POST /api/recurring/:id/advance` para adelantar $N$ cuotas o liquidar el saldo total restante.
- [x] Endpoint `PATCH /api/recurring/:id/cancel` para desactivar el plan inmediatamente sin generar cuotas futuras.
- [x] Si el MSI tenía una deuda ligada a una persona, sincroniza la deuda y retira los cobros futuros proyectados.

---

## 🛠️ Desglose de Tickets Técnicos

- [x] **TICKET-06.1: Esquema Mongoose `RecurringTemplate`**
  - Archivo `src/modules/recurring/schemas/recurring-template.schema.ts`.
  - Campos:
    - `userId`, `title`, `category` (`SERVICE`, `SUBSCRIPTION`, `MSI`, `OTHER_RECURRING`).
    - `cardId` (referencia opcional a `AccountCard`).
    - `amount` (monto mensual), `currency` (`MXN`/`USD`), `exchangeRate`.
    - Campos específicos de MSI: `totalAmount`, `totalInstallments`, `currentInstallment`, `startDate`.
    - Campos de Split / División: `split: { personId, splitType: 'PERCENTAGE' | 'FIXED', splitValue: number }`.
    - `isActive` (boolean), `isCompleted` (boolean).

- [x] **TICKET-06.2: DTOs del Módulo Recurrente**
  - `create-recurring.dto.ts`, `update-recurring.dto.ts`, `advance-msi.dto.ts`.
  - Validadores personalizados para garantizar que compras a MSI incluyan `totalInstallments >= 2`.

- [x] **TICKET-06.3: Servicio de Plantillas Recurrentes (`RecurringService`)**
  - CRUD de plantillas filtrado por `userId`.
  - Lógica para calcular montos mensuales de MSI y validación de cuotas.
  - Lógica de liquidación anticipada (`settleEarly()`).

- [x] **TICKET-06.4: Motor de Instanciación en Periodos (`RecurringEngine`)**
  - Endpoint `POST /api/recurring/instantiate`:
    - Payload: `{ "periodId": "ID_DEL_PERIODO" }`
    - Respuesta HTTP 200:
      ```json
      {
        "periodId": "654321654321654321654320",
        "year": 2026,
        "month": 9,
        "createdCount": 3,
        "skippedCount": 2
      }
      ```
    - Validaciones: 400 (ObjectId inválido), 404 (periodo inexistente o de otro usuario), 409 (periodo cerrado).
    - Idempotencia: índice único parcial en `Expense` `{ periodId: 1, templateId: 1 }` (solo para gastos con `templateId`) y mutex en memoria por `userId:periodId`. Reintentos devuelven `createdCount: 0` y `skippedCount: N` sin duplicar gastos ni adelantar cuotas.
    - Persistencia atómica de gastos reales (`Expense`), cobros vinculados (`Income` tipo `DEBT_COLLECTION`) y avance de cuotas MSI con soporte transaccional (y compensación automática si la base de datos es standalone).
    - Ajuste de centavos en la cuota final de planes MSI.
    - Prevención de re-avances accidentales de MSI si un gasto generado es eliminado del periodo.

- [x] **TICKET-06.5: Controlador `RecurringController`**
  - Endpoints REST `/api/recurring` con Swagger y autenticación `@Auth()`.

- [x] **TICKET-06.6: Pruebas Unitarias del Motor de MSI y Recurrentes**
  - Pruebas unitarias de creación de gastos, avance atómico de cuotas, ajuste de centavos, rechazo de periodos cerrados, idempotencia y rollback ante fallos.

---

## ✅ Verificación de la Feature
1. Crear un servicio "Internet Fibra" por \$650 sin fecha de fin.
2. Crear un MSI "PlayStation 5" a 6 cuotas de \$1,500 cada una (iniciando en 1/6).
3. Simular la instanciación de dos meses consecutivos y verificar:
   - Mes 1: Internet (\$650) y PS5 cuota 1/6 (\$1,500).
   - Mes 2: Internet (\$650) y PS5 cuota 2/6 (\$1,500).
4. Liquidar anticipadamente el MSI y comprobar que en el Mes 3 ya no se genere el cobro.
