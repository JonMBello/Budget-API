# Feature 05: Periodos Presupuestarios Mensuales y Ahorro Acarreado

## 📋 Objetivo
Gestionar el ciclo de vida de los presupuestos mensuales como periodos explícitos (inspirado en las hojas de cálculo pero con persistencia y aislamiento en base de datos). Permitir la inicialización de nuevos meses con arrastre automático del ahorro restante del mes previo (el cual es editable) y garantizar un historial inmutable de meses anteriores.

---

## 👤 Historias de Usuario (HUs)

### HU-05.1: Ciclo y Creación de Periodos Mensuales
> **Como** usuario,  
> **Quiero** inicializar un nuevo mes presupuestario (ej. Septiembre 2026),  
> **Para** organizar mis ingresos, egresos y metas sin mezclar meses ni alterar registros históricos.

**Criterios de Aceptación:**
- [ ] No puede existir más de un `BudgetPeriod` para el mismo usuario con el mismo `year` y `month` (índice único compuesto `{ userId, year, month }`).
- [ ] Endpoint `POST /api/budgets/initialize` que recibe el año y mes a crear (o por defecto el mes siguiente al último registrado).
- [ ] Soporte para estados: `OPEN` (activo para registrar transacciones) y `CLOSED` (cerrado/archivado).

---

### HU-05.2: Acarreo de Ahorro Restante Editable
> **Como** usuario,  
> **Quiero** que al abrir un nuevo mes, el remanente/ahorro del mes anterior se transfiera automáticamente como ahorro inicial, y tener la libertad de editarlo si dispuse de él o cambié de planes,  
> **Para** mantener continuidad de mi patrimonio sin registros manuales tediosos.

**Criterios de Aceptación:**
- [ ] Al inicializar el mes $M$, calcula el remanente final del mes $M-1$ (`Total Ingresos + Ahorro Inicial - Total Egresos`) y lo asigna al campo `carriedSavings`.
- [ ] Endpoint `PATCH /api/budgets/:year/:month/savings` para modificar manualmente el monto de `carriedSavings`.
- [ ] La modificación del ahorro inicial recalcula de inmediato el balance en tiempo real del mes.

---

### HU-05.3: Historial y Consulta de Meses
> **Como** usuario,  
> **Quiero** consultar la lista de todos mis periodos mensuales pasados y navegar a cualquier mes en particular,  
> **Para** analizar mi historial financiero y comparar mi comportamiento de gastos entre meses.

**Criterios de Aceptación:**
- [ ] Endpoint `GET /api/budgets` que devuelve la lista ordenada cronológicamente de periodos con resumen básico (año, mes, total ingresos, total egresos, ahorro final).
- [ ] Endpoint `GET /api/budgets/current` que redirige o retorna el periodo del mes actual en curso.
- [ ] Endpoint `GET /api/budgets/:year/:month` con el detalle completo del mes.

---

## 🛠️ Desglose de Tickets Técnicos

- [ ] **TICKET-05.1: Esquema Mongoose `BudgetPeriod`**
  - Archivo `src/modules/budgets/schemas/budget-period.schema.ts`.
  - Campos: `userId`, `year` (number), `month` (1-12), `status` (`OPEN`, `CLOSED`), `carriedSavings` (number, default: 0), `notes`, `createdAt`, `updatedAt`.
  - Índice único: `{ userId: 1, year: 1, month: 1 }`.

- [ ] **TICKET-05.2: DTOs del Módulo de Presupuestos**
  - `initialize-budget.dto.ts`, `update-savings.dto.ts`, `budget-response.dto.ts`.

- [ ] **TICKET-05.3: Servicio de Presupuestos (`BudgetsService`)**
  - Métodos:
    - `initializePeriod(userId, year, month)`: Lógica para obtener el mes previo, calcular balance final y asignar `carriedSavings`.
    - `getCurrentPeriod(userId)`: Encuentra el mes activo actual o el más reciente.
    - `findByYearAndMonth(userId, year, month)`.
    - `updateSavings(userId, year, month, newSavings)`.
    - `findAllByUser(userId)`.

- [ ] **TICKET-05.4: Controlador `BudgetsController`**
  - Endpoints REST documentados en Swagger con sus códigos de respuesta.

- [ ] **TICKET-05.5: Pruebas Unitarias**
  - Validación del cálculo de acarreo de ahorro entre meses consecutivos.
  - Comprobación de que no se dupliquen meses para el mismo usuario.

---

## ✅ Verificación de la Feature
1. Crear el periodo `2026-08` con un ingreso de \$15,000 y gastos de \$10,000 (remanente \$5,000).
2. Inicializar el periodo `2026-09` -> El campo `carriedSavings` debe ser exactamente \$5,000.
3. Llamar a `PATCH /api/budgets/2026/9/savings` con valor \$4,000 -> El balance debe ajustarse reflejando los \$4,000.
4. Consultar `GET /api/budgets/current` y validar la respuesta.
