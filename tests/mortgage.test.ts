import { describe, expect, it } from 'vitest';
import {
  MAX_TERM_YEARS,
  aggregateByYear,
  breakEvenReturn,
  buildSchedule,
  compareAmortizationAtYear,
  compareTerms,
  investDifference,
  monthlyNetReturn,
  monthlyPayment,
  summarize,
} from '../src/calc/mortgage';

describe('motor de cálculo', () => {
  it('compara las dos estrategias para amortizar hoy y desglosa el coste total', () => {
    const comparison = compareAmortizationAtYear({
      principal: 100000,
      annualRatePct: 5,
      years: 20,
      amount: 10000,
      year: 0,
    });

    expect(comparison.term.interestSaved).toBeGreaterThan(comparison.payment.interestSaved);
    expect(comparison.term.monthlyPayment).toBeCloseTo(monthlyPayment(100000, 5, 20), 6);
    expect(comparison.payment.monthlyPayment).toBeCloseTo(monthlyPayment(90000, 5, 20), 6);
    expect(comparison.term.totalPaid).toBeCloseTo(100000 + comparison.term.totalInterest, 6);
    expect(comparison.payment.totalPaid).toBeCloseTo(100000 + comparison.payment.totalInterest, 6);
    expect(comparison.term.principalPct + comparison.term.interestPct).toBeCloseTo(100, 10);
    expect(comparison.payment.principalPct + comparison.payment.interestPct).toBeCloseTo(100, 10);
    expect(comparison.term.monthsToPayoff).toBeLessThan(comparison.payment.monthsToPayoff);
  });

  it('amortiza al comienzo del año elegido y rechaza un importe superior al saldo', () => {
    const input = {
      principal: 100000,
      annualRatePct: 5,
      years: 20,
      amount: 10000,
    };
    const baseline = buildSchedule(input.principal, input.annualRatePct, input.years);
    const comparison = compareAmortizationAtYear({ ...input, year: 1 });

    expect(comparison.balanceAtAmortization).toBeCloseTo(baseline[11].balance, 8);
    expect(comparison.term.totalInterest).toBeGreaterThan(
      compareAmortizationAtYear({ ...input, year: 0 }).term.totalInterest,
    );
    expect(() => compareAmortizationAtYear({ ...input, year: 19, amount: 100000 })).toThrow(
      RangeError,
    );
  });

  it('no ahorra intereses con tipo 0% y refleja una amortización que cancela el saldo', () => {
    const comparison = compareAmortizationAtYear({
      principal: 12000,
      annualRatePct: 0,
      years: 2,
      amount: 12000,
      year: 0,
    });

    expect(comparison.term.interestSaved).toBe(0);
    expect(comparison.payment.interestSaved).toBe(0);
    expect(comparison.term.monthlyPayment).toBe(0);
    expect(comparison.payment.monthsToPayoff).toBe(0);
  });

  it('expone MAX_TERM_YEARS = 30', () => {
    expect(MAX_TERM_YEARS).toBe(30);
  });

  it('calcula cuota, total e intereses del escenario de referencia', () => {
    const s = summarize(150000, 3, 30);
    expect(monthlyPayment(150000, 3, 30)).toBeCloseTo(632.41, 2);
    expect(s.monthlyPayment).toBeCloseTo(632.41, 2);
    expect(s.totalInterest).toBeCloseTo(77666.18, 1);
    expect(s.totalPaid).toBeCloseTo(227666.18, 1);
    expect(s.interestPct).toBeCloseTo(34.114, 2);
    expect(s.months).toHaveLength(360);
  });

  it('maneja el tipo 0%', () => {
    const z = summarize(150000, 0, 30);
    expect(z.monthlyPayment).toBeCloseTo(416.6667, 4);
    expect(z.totalInterest).toBeCloseTo(0, 4);
    expect(z.interestPct).toBe(0);
  });

  it('cierra el capital en 0 y amortiza el importe completo', () => {
    const months = buildSchedule(150000, 3, 30);
    expect(months).toHaveLength(360);
    expect(months.at(-1)?.balance).toBeCloseTo(0, 6);
    expect(months.reduce((a, m) => a + m.principal, 0)).toBeCloseTo(150000, 2);
  });

  it('agrega por años', () => {
    const years = aggregateByYear(buildSchedule(150000, 3, 30));
    expect(years).toHaveLength(30);
    expect(years.at(-1)?.cumPrincipal).toBeCloseTo(150000, 2);
    expect(years.at(-1)?.cumInterest).toBeCloseTo(77666.18, 1);
  });

  it('convierte rentabilidad anual a mensual', () => {
    expect(monthlyNetReturn(0)).toBeCloseTo(0, 12);
    expect(monthlyNetReturn(5)).toBeCloseTo(0.00407412, 8);
  });

  it('compara plazos con presupuesto fijo', () => {
    const inv = investDifference(150000, 3, 30, 1000, 0, 30);
    expect(inv.invested).toBeCloseTo(132333.82, 1);
    expect(inv.netWealth).toBeCloseTo(inv.invested, 6);
    expect(inv.affordable).toBe(true);
    expect(investDifference(150000, 3, 30, 600, 0, 30).affordable).toBe(false);

    const w5 = investDifference(150000, 3, 5, 1000, 0, 30).netWealth;
    const w20 = investDifference(150000, 3, 20, 1000, 0, 30).netWealth;
    const w30 = investDifference(150000, 3, 30, 1000, 0, 30).netWealth;
    expect(w5).toBeGreaterThan(w20);
    expect(w20).toBeGreaterThan(w30);

    const cmp = compareTerms(150000, 3, 1000, 5, 30);
    expect(cmp.terms).toHaveLength(30);
    expect(cmp.best?.years).toBe(30);
    expect(cmp.best?.netWealth).toBeCloseTo(299727.25, 0);
  });

  it('calcula la rentabilidad de indiferencia', () => {
    expect(breakEvenReturn(150000, 3, 1000, 30, 20, 30)).toBeCloseTo(3.0416, 3);
    expect(breakEvenReturn(150000, 3, 1000, 30, 30, 30)).toBeNull();
  });
});
