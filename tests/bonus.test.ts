import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compareBonusedProducts, summarize } from '../src/calc/mortgage';
import { eur } from '../src/format';
import { questions } from '../src/questions';
import { bonusVerdict } from '../src/questions/bonus';
import { createStore } from '../src/state';

const { renderChartMock } = vi.hoisted(() => ({ renderChartMock: vi.fn() }));

vi.mock('../src/ui/chart', () => ({ renderChart: renderChartMock }));

const input = {
  principal: 150000,
  years: 30,
  baseRatePct: 3,
  bonusedRatePct: 2,
  fixedExpensesMonthly: 10,
  bankProductsMonthly: 60,
  externalProductsMonthly: 20,
};

describe('comparación de productos bonificados', () => {
  it('separa principal, intereses y gastos de cada opción', () => {
    const comparison = compareBonusedProducts(input);
    const base = summarize(150000, 3, 30);
    const bonused = summarize(150000, 2, 30);

    expect(comparison.unbonused.monthlyPayment).toBeCloseTo(base.monthlyPayment, 6);
    expect(comparison.unbonused.monthlyTotal).toBeCloseTo(base.monthlyPayment + 30, 6);
    expect(comparison.unbonused.annualTotal).toBeCloseTo((base.monthlyPayment + 30) * 12, 6);
    expect(comparison.unbonused.principal).toBe(150000);
    expect(comparison.unbonused.interest).toBeCloseTo(base.totalInterest, 6);
    expect(comparison.unbonused.expenses).toBeCloseTo(30 * 360, 6);
    expect(comparison.unbonused.totalPaid).toBeCloseTo(base.totalPaid + 30 * 360, 6);

    expect(comparison.bonused.monthlyTotal).toBeCloseTo(bonused.monthlyPayment + 70, 6);
    expect(comparison.bonused.interest).toBeCloseTo(bonused.totalInterest, 6);
    expect(comparison.bonused.expenses).toBeCloseTo(70 * 360, 6);

    expect(comparison.totalSaving).toBeCloseTo(
      comparison.unbonused.totalPaid - comparison.bonused.totalPaid,
      6,
    );
    expect(comparison.monthlySaving).toBeCloseTo(
      comparison.unbonused.monthlyTotal - comparison.bonused.monthlyTotal,
      6,
    );
  });

  it('no compensa cuando los productos cuestan más que el ahorro en intereses', () => {
    const comparison = compareBonusedProducts({ ...input, bankProductsMonthly: 200 });
    expect(comparison.totalSaving).toBeLessThan(0);
    expect(bonusVerdict(comparison.totalSaving, comparison.monthlySaving)).toContain(
      'no te compensa',
    );
  });

  it('redacta la conclusión según el ahorro', () => {
    expect(bonusVerdict(3240, 9)).toBe(
      `La bonificada te compensa: ahorras ${eur.format(3240)} en total (${eur.format(9)} al mes).`,
    );
    expect(bonusVerdict(-360, -1)).toBe(
      `La bonificada no te compensa: pagas ${eur.format(360)} más en total (${eur.format(1)} al mes).`,
    );
    expect(bonusVerdict(0, 0)).toBe('Las dos opciones te cuestan lo mismo.');
  });
});

describe('pregunta de productos bonificados', () => {
  beforeEach(() => renderChartMock.mockClear());

  function render(store = createStore()) {
    const question = questions.find((item) => item.id === 'bonificaciones');
    if (!question) throw new Error('falta la pregunta de bonificaciones');
    const container = document.createElement('div');
    question.render(container, { store });
    const field = (name: string) => {
      const el = container.querySelector<HTMLInputElement>(`[data-bonus-input="${name}"]`);
      if (!el) throw new Error(`falta el campo ${name}`);
      return el;
    };
    const value = (name: string) =>
      container.querySelector(`[data-bonus-value="${name}"]`)?.textContent;
    const type = (name: string, text: string) => {
      field(name).value = text;
      field(name).dispatchEvent(new Event('input'));
    };
    return { container, field, value, type };
  }

  it('compara las dos opciones con los costes de productos y los gastos fijos', () => {
    const store = createStore();
    store.set({ fixedExpensesMonthly: 10 });
    const { container, value, type } = render(store);

    type('bonusedRate', '2');
    type('bankProducts', '60');
    type('externalProducts', '20');

    const comparison = compareBonusedProducts(input);
    for (const mode of ['unbonused', 'bonused'] as const) {
      const option = comparison[mode];
      expect(value(`${mode}-monthly-total`)).toBe(eur.format(option.monthlyTotal));
      expect(value(`${mode}-annual-total`)).toBe(eur.format(option.annualTotal));
      expect(value(`${mode}-total-paid`)).toBe(eur.format(option.totalPaid));
      expect(value(`${mode}-principal`)).toContain(eur.format(option.principal));
      expect(value(`${mode}-interest`)).toContain(eur.format(option.interest));
      expect(value(`${mode}-expenses`)).toContain(eur.format(option.expenses));
    }
    expect(container.querySelector('[data-bonus-verdict]')?.textContent).toBe(
      bonusVerdict(comparison.totalSaving, comparison.monthlySaving),
    );

    const config = renderChartMock.mock.lastCall?.[1] as {
      data: { labels: string[]; datasets: { label: string; data: number[] }[] };
    };
    expect(config.data.labels).toEqual(['Sin bonificar', 'Bonificada']);
    expect(config.data.datasets.map((dataset) => dataset.label)).toEqual([
      'Principal',
      'Intereses',
      'Gastos y productos',
    ]);
  });

  it('oculta los resultados si los datos de la pregunta no son válidos', () => {
    const { container, type } = render();
    const results = container.querySelector<HTMLElement>('[data-bonus-results]');

    type('bankProducts', '-5');
    expect(results?.hidden).toBe(true);
    expect(container.querySelector('[data-bonus-error="bankProducts"]')?.textContent).toBe(
      'El coste no puede ser negativo.',
    );

    type('bankProducts', '5');
    type('bonusedRate', '25');
    expect(results?.hidden).toBe(true);

    type('bonusedRate', '2.5');
    expect(results?.hidden).toBe(false);
  });
});
