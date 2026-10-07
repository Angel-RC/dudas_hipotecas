import { describe, expect, it, vi } from 'vitest';
import { buildSchedule, compareTerms } from '../src/calc/mortgage';
import { eur } from '../src/format';
import { questions } from '../src/questions';
import { createStore } from '../src/state';

const { renderChartMock } = vi.hoisted(() => ({ renderChartMock: vi.fn() }));

vi.mock('../src/ui/chart', () => ({ renderChart: renderChartMock }));

describe('pregunta de hipoteca e inversión', () => {
  it('usa el presupuesto conjunto y la rentabilidad neta para mostrar el mejor plazo', () => {
    const question = questions.find((item) => item.id === 'invertir');
    expect(question).toBeDefined();
    if (!question) return;

    const state = { principal: 100000, rate: 5, years: 10 };
    const container = document.createElement('div');
    question.render(container, { store: createStore(state) });

    const budget = container.querySelector<HTMLInputElement>('[data-investment-budget]');
    const netReturn = container.querySelector<HTMLInputElement>('[data-investment-return]');
    if (!budget || !netReturn) throw new Error('faltan parámetros del comparador');
    budget.value = '600';
    netReturn.value = '30';
    budget.dispatchEvent(new Event('input'));
    netReturn.dispatchEvent(new Event('input'));

    const comparison = compareTerms(state.principal, state.rate, 600, 30, state.years);
    const best = comparison.best;
    if (!best) throw new Error('debe haber al menos un plazo asequible');
    expect(best.years).toBeGreaterThan(state.years);
    const horizonMonths = state.years * 12;
    const expectedBalance = buildSchedule(state.principal, state.rate, best.years)[
      horizonMonths - 1
    ].balance;

    expect(container.querySelector('[data-investment-budget]')).not.toBeNull();
    expect(container.querySelector('[data-investment-return]')).not.toBeNull();
    expect(container.querySelector('[data-best-term]')?.textContent).not.toBe('');
    expect(container.querySelector('[data-best-monthly-payment]')?.textContent).not.toBe('');
    expect(container.querySelector('[data-best-monthly-investment]')?.textContent).not.toBe('');
    expect(container.querySelector('[data-best-invested]')?.textContent).not.toBe('');
    expect(container.querySelector('[data-best-outstanding-debt]')?.textContent).toBe(
      eur.format(expectedBalance),
    );
    expect(container.querySelector('[data-best-net-wealth]')?.textContent).not.toBe('');
  });

  it('actualiza la comparación y avisa si el presupuesto no cubre ningún plazo', () => {
    const question = questions.find((item) => item.id === 'invertir');
    if (!question) throw new Error('falta la pregunta de inversión');

    const container = document.createElement('div');
    question.render(container, { store: createStore() });
    const budget = container.querySelector<HTMLInputElement>('[data-investment-budget]');
    const netReturn = container.querySelector<HTMLInputElement>('[data-investment-return]');
    const error = container.querySelector<HTMLElement>('[data-investment-error]');
    const results = container.querySelector<HTMLElement>('[data-investment-results]');
    if (!budget || !netReturn || !error || !results) {
      throw new Error('faltan controles o resultados');
    }

    budget.value = '1';
    budget.dispatchEvent(new Event('input'));
    expect(error.textContent).not.toBe('');
    expect(results.hidden).toBe(true);

    budget.value = '1000';
    netReturn.value = '';
    netReturn.dispatchEvent(new Event('input'));
    expect(error.textContent).not.toBe('');
    expect(results.hidden).toBe(true);
  });
});
