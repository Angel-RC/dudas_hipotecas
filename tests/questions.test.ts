import { beforeEach, describe, expect, it, vi } from 'vitest';
import { questions } from '../src/questions';
import { createStore } from '../src/state';

const { renderChartMock } = vi.hoisted(() => ({ renderChartMock: vi.fn() }));

vi.mock('../src/ui/chart', () => ({ renderChart: renderChartMock }));

describe('pregunta de amortización', () => {
  beforeEach(() => renderChartMock.mockClear());

  it('pide importe y año y muestra ambos escenarios separados', () => {
    const question = questions.find((item) => item.id === 'amortizacion');
    expect(question).toBeDefined();
    if (!question) return;

    const container = document.createElement('div');
    question.render(container, { store: createStore() });

    expect(container.textContent).toContain('¿Me interesa amortizar?');
    expect(container.querySelector('[data-amortization-amount]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-year]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-mode]')).toBeNull();
    expect(container.querySelector('[data-interest-savings-chart]')).toBeNull();
    expect(container.querySelector('[data-amortization-scenario="term"]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-scenario="payment"]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-divider]')).not.toBeNull();
    expect(container.querySelector('[data-amortization-date-summary]')).not.toBeNull();
    expect(
      container.querySelector('[data-amortization-value="term-monthly-payment"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-amortization-value="payment-interest-saved"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('Principal');
    expect(container.textContent).toContain('Intereses');
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
    if (!amount || !year || !termInterest || !dateSummary) {
      throw new Error('faltan controles o resultados');
    }

    const initialInterestSaved = termInterest.textContent;
    const initialDateSummary = dateSummary.textContent;
    amount.value = '20000';
    amount.dispatchEvent(new Event('input'));
    expect(termInterest.textContent).not.toBe(initialInterestSaved);

    const interestSavedAtToday = termInterest.textContent;
    year.value = '1';
    year.dispatchEvent(new Event('change'));
    expect(termInterest.textContent).not.toBe(interestSavedAtToday);
    expect(dateSummary.textContent).not.toBe(initialDateSummary);
  });
});
