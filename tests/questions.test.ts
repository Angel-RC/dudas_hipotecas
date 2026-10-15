import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compareAmortizationAtYear } from '../src/calc/mortgage';
import { eur, pct } from '../src/format';
import { questions } from '../src/questions';
import { createStore } from '../src/state';

const { renderChartMock } = vi.hoisted(() => ({ renderChartMock: vi.fn() }));

vi.mock('../src/ui/chart', () => ({ renderChart: renderChartMock }));

describe('pregunta de amortización', () => {
  beforeEach(() => renderChartMock.mockClear());

  it('pide importe y año y muestra la situación actual junto a los dos escenarios', () => {
    const question = questions.find((item) => item.id === 'amortizacion');
    expect(question).toBeDefined();
    if (!question) return;

    const container = document.createElement('div');
    question.render(container, { store: createStore() });

    const amountInput = container.querySelector<HTMLInputElement>('[data-amortization-amount]');
    expect(amountInput).not.toBeNull();
    expect(amountInput?.type).toBe('text');
    expect(amountInput?.value).toBe('15.000');
    expect(container.querySelector('[data-amortization-year]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-mode]')).toBeNull();
    expect(container.querySelector('[data-interest-savings-chart]')).toBeNull();
    expect(container.querySelector('[data-amortization-baseline]')).toBeNull();
    expect(container.querySelector('[data-amortization-scenario="current"]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-scenario="term"]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-scenario="payment"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-amortization-divider]')).toHaveLength(2);
    expect(container.querySelector('[data-amortization-date-summary]')).not.toBeNull();
    expect(
      [...container.querySelectorAll('[data-amortization-scenario]')].map((scenario) =>
        scenario.getAttribute('data-amortization-scenario'),
      ),
    ).toEqual(['current', 'term', 'payment']);

    const baseline = compareAmortizationAtYear({
      principal: 150000,
      annualRatePct: 3,
      years: 30,
      amount: 15000,
      year: 0,
    }).baseline;
    expect(
      container.querySelector('[data-amortization-value="current-monthly-payment"]')?.textContent,
    ).toBe(eur.format(baseline.monthlyPayment));
    expect(
      container.querySelector('[data-amortization-value="current-interest-saved"]')?.textContent,
    ).toBe(eur.format(0));
    expect(
      container.querySelector('[data-amortization-value="current-total-paid"]')?.textContent,
    ).toBe(eur.format(baseline.totalPaid));
    expect(
      container.querySelector('[data-amortization-value="current-total-interest"]')?.textContent,
    ).toContain(eur.format(baseline.totalInterest));
    expect(
      container.querySelector('[data-amortization-value="term-monthly-payment"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-amortization-value="payment-interest-saved"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('Principal');
    expect(container.textContent).toContain('Intereses');
    expect(container.textContent).not.toMatch(/gastos/i);
    expect(container.textContent).not.toContain('Intereses y gastos ahorrados');
    expect(renderChartMock).not.toHaveBeenCalled();
  });

  it('actualiza los resultados al cambiar la cantidad y el año de amortización', () => {
    const question = questions.find((item) => item.id === 'amortizacion');
    if (!question) throw new Error('falta la pregunta de amortización');

    const container = document.createElement('div');
    question.render(container, { store: createStore() });
    const amount = container.querySelector<HTMLInputElement>('[data-amortization-amount]');
    const year = container.querySelector<HTMLSelectElement>('[data-amortization-year]');
    const termInterest = container.querySelector<HTMLElement>(
      '[data-amortization-value="term-interest-saved"]',
    );
    const dateSummary = container.querySelector<HTMLElement>('[data-amortization-date-summary]');
    const currentInterestSaved = container.querySelector<HTMLElement>(
      '[data-amortization-value="current-interest-saved"]',
    );
    if (!amount || !year || !termInterest || !dateSummary || !currentInterestSaved) {
      throw new Error('faltan controles o resultados');
    }

    const initialInterestSaved = termInterest.textContent;
    const initialDateSummary = dateSummary.textContent;
    amount.value = '20.000';
    amount.dispatchEvent(new Event('input'));
    amount.dispatchEvent(new Event('blur'));
    expect(amount.value).toBe('20.000');
    expect(termInterest.textContent).not.toBe(initialInterestSaved);
    expect(currentInterestSaved.textContent).toBe(eur.format(0));

    const interestSavedAtToday = termInterest.textContent;
    year.value = '1';
    year.dispatchEvent(new Event('change'));
    expect(termInterest.textContent).not.toBe(interestSavedAtToday);
    expect(dateSummary.textContent).not.toBe(initialDateSummary);
    expect(currentInterestSaved.textContent).toBe(eur.format(0));
  });

  it('incluye los gastos acumulados en los intereses totales y el total pagado', () => {
    const question = questions.find((item) => item.id === 'amortizacion');
    if (!question) throw new Error('falta la pregunta de amortización');

    const store = createStore();
    store.set({ fixedExpensesMonthly: 100 });
    const container = document.createElement('div');
    question.render(container, { store });
    const amountInput = container.querySelector<HTMLInputElement>('[data-amortization-amount]');
    const yearInput = container.querySelector<HTMLSelectElement>('[data-amortization-year]');
    if (!amountInput || !yearInput) throw new Error('faltan controles de amortización');
    amountInput.value = '15.000';
    amountInput.dispatchEvent(new Event('input'));
    yearInput.value = '1';
    yearInput.dispatchEvent(new Event('change'));

    const comparison = compareAmortizationAtYear({
      principal: 150000,
      annualRatePct: 3,
      years: 30,
      amount: 15000,
      year: 1,
    });
    const scenarios = [
      ['current', comparison.baseline],
      ['term', comparison.term],
      ['payment', comparison.payment],
    ] as const;

    for (const [mode, scenario] of scenarios) {
      const expenses = 100 * scenario.monthsToPayoff;
      const totalPaid = scenario.totalPaid + expenses;
      const totalInterestAndExpenses = scenario.totalInterest + expenses;
      expect(
        container.querySelector(`[data-amortization-value="${mode}-total-paid"]`)?.textContent,
      ).toBe(eur.format(totalPaid));
      expect(
        container.querySelector(`[data-amortization-value="${mode}-principal-composition"]`)
          ?.textContent,
      ).toBe(`${eur.format(150000)} (${pct.format((150000 / totalPaid) * 100)})`);
      expect(
        container.querySelector(`[data-amortization-value="${mode}-total-interest"]`)?.textContent,
      ).toBe(
        `${eur.format(totalInterestAndExpenses)} (${pct.format(
          (totalInterestAndExpenses / totalPaid) * 100,
        )})`,
      );
    }

    for (const [mode, scenario] of scenarios) {
      const expensesSaved = 100 * (comparison.baseline.monthsToPayoff - scenario.monthsToPayoff);
      expect(
        container.querySelector(`[data-amortization-value="${mode}-expenses-saved"]`)?.textContent,
      ).toBe(eur.format(expensesSaved));
    }
    expect(container.textContent).toContain('Gastos ahorrados');
    expect(container.textContent).not.toContain('Intereses y gastos ahorrados');
  });
});
