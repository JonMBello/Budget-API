export enum AccountCardType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  CASH = 'CASH',
}

export interface StatementCycleOptions {
  purchaseDate: Date | string;
  cutoffDay?: number | null;
  paymentDueDay?: number | null;
  type?: AccountCardType | string;
}

export interface StatementCycleResult {
  cutoffDate: string | null;
  paymentDueDate: string;
  impactBudgetYear: number;
  impactBudgetMonth: number;
  impactBudgetPeriod: string;
  daysUntilDue: number;
}

/**
 * Returns the number of days in a given month (1-indexed month: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Pads a number to 2 digits.
 */
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Formats year, month (1-indexed) and day into 'YYYY-MM-DD'.
 */
export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Parses a date or date string into { year, month (1-indexed), day }.
 * Prevents UTC timezone shift on plain date strings ('YYYY-MM-DD').
 */
export function parseDateComponents(date: Date | string): {
  year: number;
  month: number;
  day: number;
} {
  if (typeof date === 'string') {
    const cleanDate = date.trim().slice(0, 10);
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
    const parsed = new Date(date);
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
    };
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/**
 * Pure function to calculate credit card statement cutoff, payment due date,
 * and the cashflow budget impact month/year.
 */
export function calculateStatementCycle(options: StatementCycleOptions): StatementCycleResult {
  const { purchaseDate, cutoffDay, paymentDueDay, type } = options;
  const { year: pYear, month: pMonth, day: pDay } = parseDateComponents(purchaseDate);

  // If card is DEBIT or CASH, or missing statement days, outflow is immediate
  if (
    type === AccountCardType.DEBIT ||
    type === AccountCardType.CASH ||
    cutoffDay == null ||
    paymentDueDay == null
  ) {
    const formattedDate = formatDate(pYear, pMonth, pDay);
    return {
      cutoffDate: null,
      paymentDueDate: formattedDate,
      impactBudgetYear: pYear,
      impactBudgetMonth: pMonth,
      impactBudgetPeriod: `${pYear}-${pad(pMonth)}`,
      daysUntilDue: 0,
    };
  }

  // Determine Cutoff Date
  const daysInPurchaseMonth = getDaysInMonth(pYear, pMonth);
  const effectiveCutoffInPurchaseMonth = Math.min(cutoffDay, daysInPurchaseMonth);

  let cYear = pYear;
  let cMonth = pMonth;

  if (pDay <= effectiveCutoffInPurchaseMonth) {
    // Purchase occurs on or before cutoff: statement cuts this month
    cYear = pYear;
    cMonth = pMonth;
  } else {
    // Purchase occurs after cutoff: statement cuts next month
    cMonth = pMonth + 1;
    if (cMonth > 12) {
      cMonth = 1;
      cYear = pYear + 1;
    }
  }

  const cDay = Math.min(cutoffDay, getDaysInMonth(cYear, cMonth));
  const cutoffDate = formatDate(cYear, cMonth, cDay);

  // Determine Payment Due Date
  let dueYear = cYear;
  let dueMonth = cMonth;

  if (paymentDueDay <= cutoffDay) {
    // Payment is in the month following the cutoff
    dueMonth = cMonth + 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear = cYear + 1;
    }
  } else {
    // Payment is in the same month as cutoff (e.g. cutoff on day 10, payment on day 28)
    dueYear = cYear;
    dueMonth = cMonth;
  }

  const dueDay = Math.min(paymentDueDay, getDaysInMonth(dueYear, dueMonth));
  const paymentDueDate = formatDate(dueYear, dueMonth, dueDay);

  // Calculate days until due date from purchase date
  const purchaseUtc = Date.UTC(pYear, pMonth - 1, pDay);
  const dueUtc = Date.UTC(dueYear, dueMonth - 1, dueDay);
  const diffDays = Math.round((dueUtc - purchaseUtc) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.max(0, diffDays);

  return {
    cutoffDate,
    paymentDueDate,
    impactBudgetYear: dueYear,
    impactBudgetMonth: dueMonth,
    impactBudgetPeriod: `${dueYear}-${pad(dueMonth)}`,
    daysUntilDue,
  };
}
