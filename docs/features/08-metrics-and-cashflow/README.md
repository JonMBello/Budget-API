# Feature 08: Métricas en Tiempo Real y Remanente Disponible de Nómina

## 📋 Objetivo
Calcular y exponer resúmenes financieros en tiempo real para cualquier periodo mensual. Ofrecer la métrica especializada de **Remanente Libre de Nómina** (sueldo menos compromisos fijos recurrentes como servicios, suscripciones y cuotas de MSI) para saber con exactitud cuánto dinero queda disponible para gastos personales discrecionales.

---

## 👤 Historias de Usuario (HUs)

### HU-08.1: Balance Mensual en Tiempo Real
> **Como** usuario,  
> **Quiero** ver el balance general de mi mes actualizado inmediatamente cada vez que agrego, modifico o elimino un gasto o ingreso,  
> **Para** saber cuánto dinero real me queda en el mes considerando el ahorro previo.

**Criterios de Aceptación:**
- [ ] Endpoint `GET /api/budgets/:year/:month/summary` (y `/api/budgets/current/summary`).
- [ ] Retorna:
  - `carriedSavings`: Ahorro transferido del mes anterior.
  - `totalIncome`: Suma de todos los ingresos (recibidos y proyectados).
  - `totalReceivedIncome`: Suma solo de ingresos ya efectivamente cobrados.
  - `totalExpense`: Suma de todos los egresos del mes.
  - `netBalance`: `(carriedSavings + totalIncome) - totalExpense`.
  - `cashInPocketBalance`: `(carriedSavings + totalReceivedIncome) - totalPaidExpense`.

---

### HU-08.2: Cálculo Especializado de Remanente de Nómina para Compras Personales
> **Como** usuario que planifica sus compras regulares (salidas, ropa, gustos personales),  
> **Quiero** ver el total de mis cargos fijos recurrentes (servicios, suscripciones, cuotas de MSI) restado exclusivamente de mis ingresos de nómina,  
> **Para** conocer mi presupuesto discrecional seguro sin poner en riesgo el pago de mis compromisos.

**Criterios de Aceptación:**
- [ ] Identifica todos los egresos del mes con categorías recurrentes (`SERVICE`, `SUBSCRIPTION`, `MSI`).
- [ ] Suma todos los ingresos del mes con `source: 'PAYROLL'`.
- [ ] Calcula:
  $$\text{DiscretionaryPayrollSurplus} = \text{TotalPayrollIncome} - (\text{Services} + \text{Subscriptions} + \text{MSI\_Installments})$$
- [ ] Muestra el total ya gastado en compras regulares personales (`REGULAR_EXPENSE`) y cuánto queda de ese excedente de nómina.

---

### HU-08.3: Resumen de Cuentas por Cobrar y Deudas
> **Como** usuario,  
> **Quiero** ver en el resumen mensual cuánto dinero tengo pendiente de cobrar a terceros en este mes y globalmente,  
> **Para** dar seguimiento a las personas que me deben dinero antes de las fechas de corte/pago.

**Criterios de Aceptación:**
- [ ] Muestra el total de cobros pendientes del mes (`source: 'DEBT_COLLECTION'`, `isReceived: false`).
- [ ] Lista los deudores del mes con sus montos y fechas de vencimiento próximas.

---

## 🛠️ Desglose de Tickets Técnicos

- [ ] **TICKET-08.1: Servicio de Métricas Financieras (`BudgetMetricsService`)**
  - Archivo `src/modules/budgets/services/budget-metrics.service.ts`.
  - Agregaciones optimizadas en MongoDB para:
    - Agrupar egresos por categoría (`SERVICE`, `SUBSCRIPTION`, `MSI`, `REGULAR_EXPENSE`, etc.).
    - Agrupar ingresos por fuente (`PAYROLL`, `DEBT_COLLECTION`, etc.).
    - Calcular balances netos y métricas de nómina.

- [ ] **TICKET-08.2: DTO de Respuesta de Métricas (`BudgetSummaryDto`)**
  - Documentar en Swagger todos los campos devueltos: balances, remanente de nómina, desglose por categoría y deudores pendientes.

- [ ] **TICKET-08.3: Integración de Endpoints en `BudgetsController`**
  - `GET /api/budgets/:year/:month/summary`
  - `GET /api/budgets/current/summary`

- [ ] **TICKET-08.4: Pruebas Unitarias de Cálculos Financieros**
  - Caso de prueba:
    - Nómina: \$25,000.
    - Servicios: \$1,500 (Luz \$600, Internet \$650, Agua \$250).
    - Suscripciones: \$600 (Netflix \$250, Spotify \$150, iCloud \$200).
    - MSI: \$4,000 (Laptop \$2,500, Teléfono \$1,500).
    - Compras regulares realizadas: \$3,000.
    - Resultado esperado:
      - Compromisos fijos = \$6,100.
      - Remanente inicial de nómina = \$18,900.
      - Disponible restante = \$15,900.

---

## ✅ Verificación de la Feature
1. Crear un mes con una nómina de \$20,000, una suscripción de \$500 y un MSI de \$2,000.
2. Consultar `/api/budgets/current/summary`.
3. Verificar que `discretionaryPayrollSurplus` sea exactamente \$17,500.
4. Agregar un gasto regular de \$1,000 y volver a consultar; comprobar que el remanente disponible se actualice a \$16,500 inmediatamente.
