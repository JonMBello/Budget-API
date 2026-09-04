# Feature 07: Transacciones, Gastos, Ingresos y División de Cuentas (Splits)

## 📋 Objetivo
Gestionar el registro de ingresos y egresos vinculados a los periodos presupuestarios mensuales. Incluye categorización flexible, registro de fuentes de ingreso (nómina, depósitos, cobro de deudas), clonación de ingresos para meses nuevos, y el mecanismo de **división de gastos (splits)** que genera automáticamente un ingreso proyectado por cobrar cuando se presta la tarjeta o se divide un gasto con un tercero.

---

## 👤 Historias de Usuario (HUs)

### HU-07.1: Registro y Categorización de Egresos (Gastos)
> **Como** usuario,  
> **Quiero** registrar mis compras y gastos del mes con fecha, categoría, monto y tarjeta utilizada,  
> **Para** saber en qué se va mi dinero y asociarlo al método de pago correspondiente.

**Criterios de Aceptación:**
- [ ] Endpoint `POST /api/expenses`.
- [ ] Campos: `title`, `amount`, `category` (`SERVICE`, `SUBSCRIPTION`, `MSI`, `REGULAR_EXPENSE`, `FOOD`, `TRANSPORT`, etc.), `date`, `cardId` (opcional), `periodId`.
- [ ] Si se asocia a una tarjeta de crédito, calcula la fecha de vencimiento `paymentDueDate`.
- [ ] Endpoints para listar (`GET /api/expenses`), editar (`PATCH /api/expenses/:id`) y eliminar (`DELETE /api/expenses/:id`).

---

### HU-07.2: División de Gastos y Generación de Ingreso Proyectado
> **Como** usuario que prestó su tarjeta o pagó una cuenta compartida,  
> **Quiero** asignar un porcentaje o monto fijo de la compra como deuda a una persona,  
> **Para** que la API registre el 100% del gasto en mi tarjeta pero cree automáticamente un ingreso por cobrar de la parte ajena.

**Criterios de Aceptación:**
- [ ] En la creación o edición de un gasto, se puede incluir el objeto `split: { personId, type: 'PERCENTAGE' | 'FIXED', value: number }`.
- [ ] El sistema calcula el `splitAmount` (lo que le toca a la otra persona).
- [ ] Crea automáticamente un registro en la colección `Income` en el mismo mes con:
  - `source: 'DEBT_COLLECTION'`.
  - `title: 'Cobro a [Nombre Persona]: [Título del Gasto]'`.
  - `amount: splitAmount`.
  - `isReceived: false`.
  - `dueDate`: fecha límite de la tarjeta o del gasto.
  - `linkedExpenseId`: referencia cruzada.
- [ ] Si se edita el monto del gasto o el split, el ingreso proyectado se recalcula en sincronía.
- [ ] Si se elimina el gasto, el ingreso proyectado se elimina automáticamente.

---

### HU-07.3: Registro y Fuentes de Ingreso
> **Como** usuario,  
> **Quiero** registrar mis ingresos con su fecha y fuente específica (nómina, depósitos, cobros, etc.),  
> **Para** diferenciar mis ingresos fijos de trabajo de otros ingresos secundarios o esporádicos.

**Criterios de Aceptación:**
- [ ] Endpoint `POST /api/incomes`.
- [ ] Campos: `title`, `amount`, `date`, `source` (`PAYROLL`, `DEBT_COLLECTION`, `DEPOSIT`, `INVESTMENT`, `OTHER`), `isReceived` (boolean).
- [ ] Endpoints para listar (`GET /api/incomes`), editar (`PATCH /api/incomes/:id`) y eliminar (`DELETE /api/incomes/:id`).

---

### HU-07.4: Clonar Ingresos del Mes Anterior
> **Como** usuario cuyos ingresos de nómina son regulares,  
> **Quiero** copiar los ingresos del mes anterior al nuevo mes activo con un solo clic,  
> **Para** no tener que capturar manualmente mi sueldo y fuentes recurrentes cada primero de mes.

**Criterios de Aceptación:**
- [ ] Endpoint `POST /api/incomes/copy-from-previous-month`.
- [ ] Copia todos los ingresos del mes anterior que tengan `source: 'PAYROLL'` o recurrente (omite cobros de deudas de terceros específicos ya liquidados).
- [ ] Los nuevos ingresos se crean con `isReceived: false` y fecha ajustada al mes actual.

---

## 🛠️ Desglose de Tickets Técnicos

- [ ] **TICKET-07.1: Esquema Mongoose `Expense`**
  - Archivo `src/modules/expenses/schemas/expense.schema.ts`.
  - Campos: `userId`, `periodId`, `templateId`, `cardId`, `title`, `amount`, `category`, `date`, `paymentDueDate`, `isPaid`, `split: { personId, splitAmount, isDebtActive, linkedIncomeId }`.
  - Índices: `{ userId: 1, periodId: 1 }`.

- [ ] **TICKET-07.2: Esquema Mongoose `Income`**
  - Archivo `src/modules/incomes/schemas/income.schema.ts`.
  - Campos: `userId`, `periodId`, `title`, `amount`, `date`, `source` (`PAYROLL`, `DEBT_COLLECTION`, `DEPOSIT`, `INVESTMENT`, `OTHER`), `isReceived`, `linkedExpenseId`, `debtorPersonId`.
  - Índices: `{ userId: 1, periodId: 1 }`.

- [ ] **TICKET-07.3: DTOs de Gastos e Ingresos**
  - `create-expense.dto.ts` (con validador anidado de `split`), `update-expense.dto.ts`.
  - `create-income.dto.ts`, `update-income.dto.ts`, `copy-incomes.dto.ts`.

- [ ] **TICKET-07.4: Servicio de Gastos con Lógica de Split (`ExpensesService`)**
  - Al guardar un gasto con split: inyectar `IncomesService` y crear el ingreso projected.
  - Al actualizar gasto: recalcular o crear/borrar el ingreso proyectado.
  - Al borrar gasto: borrar el ingreso vinculado si no ha sido marcado como pagado.

- [ ] **TICKET-07.5: Servicio de Ingresos (`IncomesService`)**
  - Métodos: `create()`, `findAllByPeriod()`, `update()`, `remove()`, `copyFromPreviousMonth()`.

- [ ] **TICKET-07.6: Controladores `ExpensesController` e `IncomesController`**
  - Endpoints REST con Swagger bajo `/api/expenses` y `/api/incomes`.

- [ ] **TICKET-07.7: Pruebas Unitarias e Integración de Splits**
  - Probar que la creación de un gasto de \$1,000 con 40% a favor de una persona genere un ingreso proyectado de \$400.
  - Probar eliminación en cascada del ingreso proyectado al eliminar el gasto.

---

## ✅ Verificación de la Feature
1. Registrar un gasto de \$3,000 en Banorte pagando una cena familiar con split del 50% asignado a "Hermano".
2. Verificar que en la lista de egresos figure el gasto completo de \$3,000.
3. Verificar que en la lista de ingresos aparezca automáticamente un ingreso por cobrar de \$1,500 de "Hermano".
4. Inicializar un mes nuevo y ejecutar `POST /api/incomes/copy-from-previous-month`, confirmando que los ingresos de nómina se repliquen correctamente.
