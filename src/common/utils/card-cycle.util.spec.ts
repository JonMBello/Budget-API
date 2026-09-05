import {
  calculateStatementCycle,
  AccountCardType,
  getDaysInMonth,
  formatDate,
  parseDateComponents,
} from './card-cycle.util';

describe('CardCycleUtil', () => {
  describe('getDaysInMonth', () => {
    it('should return correct number of days for various months', () => {
      expect(getDaysInMonth(2026, 1)).toBe(31); // Jan
      expect(getDaysInMonth(2026, 2)).toBe(28); // Feb non-leap
      expect(getDaysInMonth(2028, 2)).toBe(29); // Feb leap year
      expect(getDaysInMonth(2026, 4)).toBe(30); // Apr
      expect(getDaysInMonth(2026, 12)).toBe(31); // Dec
    });
  });

  describe('formatDate and parseDateComponents', () => {
    it('should format date numbers with zero padding', () => {
      expect(formatDate(2026, 9, 5)).toBe('2026-09-05');
      expect(formatDate(2026, 12, 25)).toBe('2026-12-25');
    });

    it('should parse date string without timezone skew', () => {
      const parsed = parseDateComponents('2026-09-10');
      expect(parsed).toEqual({ year: 2026, month: 9, day: 10 });
    });

    it('should parse Date object correctly', () => {
      const date = new Date(2026, 8, 10); // month is 0-indexed in JS Date: 8 = Sept
      const parsed = parseDateComponents(date);
      expect(parsed).toEqual({ year: 2026, month: 9, day: 10 });
    });
  });

  describe('calculateStatementCycle', () => {
    it('Scenario 1: Purchase BEFORE cutoff day (cutoff 15, payment 5)', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-09-10',
        cutoffDay: 15,
        paymentDueDay: 5,
        type: AccountCardType.CREDIT,
      });

      expect(result.cutoffDate).toBe('2026-09-15');
      expect(result.paymentDueDate).toBe('2026-10-05');
      expect(result.impactBudgetYear).toBe(2026);
      expect(result.impactBudgetMonth).toBe(10);
      expect(result.impactBudgetPeriod).toBe('2026-10');
      expect(result.daysUntilDue).toBe(25);
    });

    it('Scenario 2: Purchase ON the cutoff day (cutoff 15, payment 5)', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-09-15',
        cutoffDay: 15,
        paymentDueDay: 5,
        type: AccountCardType.CREDIT,
      });

      expect(result.cutoffDate).toBe('2026-09-15');
      expect(result.paymentDueDate).toBe('2026-10-05');
      expect(result.impactBudgetYear).toBe(2026);
      expect(result.impactBudgetMonth).toBe(10);
      expect(result.impactBudgetPeriod).toBe('2026-10');
      expect(result.daysUntilDue).toBe(20);
    });

    it('Scenario 3: Purchase AFTER cutoff day (cutoff 15, payment 5)', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-09-16',
        cutoffDay: 15,
        paymentDueDay: 5,
        type: AccountCardType.CREDIT,
      });

      expect(result.cutoffDate).toBe('2026-10-15');
      expect(result.paymentDueDate).toBe('2026-11-05');
      expect(result.impactBudgetYear).toBe(2026);
      expect(result.impactBudgetMonth).toBe(11);
      expect(result.impactBudgetPeriod).toBe('2026-11');
      expect(result.daysUntilDue).toBe(50);
    });

    it('Scenario 4: Year rollover (Purchase in late December with payment in February)', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-12-20',
        cutoffDay: 15,
        paymentDueDay: 5,
        type: AccountCardType.CREDIT,
      });

      expect(result.cutoffDate).toBe('2027-01-15');
      expect(result.paymentDueDate).toBe('2027-02-05');
      expect(result.impactBudgetYear).toBe(2027);
      expect(result.impactBudgetMonth).toBe(2);
      expect(result.impactBudgetPeriod).toBe('2027-02');
      expect(result.daysUntilDue).toBe(47);
    });

    it('Scenario 5: Payment due day GREATER than cutoff day (same month payment)', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-05-02',
        cutoffDay: 10,
        paymentDueDay: 28,
        type: AccountCardType.CREDIT,
      });

      expect(result.cutoffDate).toBe('2026-05-10');
      expect(result.paymentDueDate).toBe('2026-05-28');
      expect(result.impactBudgetYear).toBe(2026);
      expect(result.impactBudgetMonth).toBe(5);
      expect(result.impactBudgetPeriod).toBe('2026-05');
      expect(result.daysUntilDue).toBe(26);
    });

    it('Scenario 6: Short month handling - February in non-leap year (cutoff day 31)', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-02-10',
        cutoffDay: 31,
        paymentDueDay: 20,
        type: AccountCardType.CREDIT,
      });

      expect(result.cutoffDate).toBe('2026-02-28');
      expect(result.paymentDueDate).toBe('2026-03-20');
      expect(result.impactBudgetPeriod).toBe('2026-03');
    });

    it('Scenario 7: Short month handling - February in leap year (cutoff day 31)', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2028-02-15',
        cutoffDay: 31,
        paymentDueDay: 15,
        type: AccountCardType.CREDIT,
      });

      expect(result.cutoffDate).toBe('2028-02-29');
      expect(result.paymentDueDate).toBe('2028-03-15');
      expect(result.impactBudgetPeriod).toBe('2028-03');
    });

    it('Scenario 8: DEBIT account type has immediate cash outflow', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-09-10',
        type: AccountCardType.DEBIT,
      });

      expect(result.cutoffDate).toBeNull();
      expect(result.paymentDueDate).toBe('2026-09-10');
      expect(result.impactBudgetYear).toBe(2026);
      expect(result.impactBudgetMonth).toBe(9);
      expect(result.impactBudgetPeriod).toBe('2026-09');
      expect(result.daysUntilDue).toBe(0);
    });

    it('Scenario 9: CASH account type has immediate cash outflow', () => {
      const result = calculateStatementCycle({
        purchaseDate: '2026-09-10',
        type: AccountCardType.CASH,
      });

      expect(result.cutoffDate).toBeNull();
      expect(result.paymentDueDate).toBe('2026-09-10');
      expect(result.impactBudgetPeriod).toBe('2026-09');
      expect(result.daysUntilDue).toBe(0);
    });
  });
});
