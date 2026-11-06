import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSchedule,
  compareMortgageSwitch,
  monthlyPayment,
  pendingBalance,
  summarize,
  switchFeeAmount,
} from '../src/calc/mortgage';
import { eur } from '../src/format';
import { questions } from '../src/questions';
import { switchVerdict } from '../src/questions/switchMortgage';
import { createStore } from '../src/state';

const { renderChartMock } = vi.hoisted(() => ({ renderChartMock: vi.fn() }));

vi.mock('../src/ui/chart', () => ({ renderChart: renderChartMock }));

const input = {
  principal: 150000,
  years: 30,
  currentRatePct: 3,
  newRatePct: 2.5,
  fixedExpensesMonthly: 10,
  fee: 1500,
};

describe('comisión del cambio', () => {
  it('acepta la comisión en euros o como porcentaje del capital pendiente', () => {
    expect(switchFeeAmount(150000, 1500, 'eur')).toBe(1500);
    expect(switchFeeAmount(150000, 0.5, 'pct')).toBeCloseTo(750, 6);
  });
});

describe('capital pendiente', () => {
  it('es el importe inicial si quedan todas las mensualidades', () => {
    expect(pendingBalance(150000, 3, 30, 360)).toBe(150000);
  });

  it('sale del cuadro de amortización según las mensualidades que quedan', () => {
    expect(pendingBalance(150000, 3, 30, 240)).toBeCloseTo(
      buildSchedule(150000, 3, 30)[119].balance,
      6,
    );
    expect(pendingBalance(150000, 3, 30, 246)).toBeCloseTo(
      buildSchedule(150000, 3, 30)[113].balance,
      6,
    );
  });
});

describe('comparación del cambio de hipoteca', () => {
  it('suma la comisión solo al cambio y los gastos fijos a las dos opciones', () => {
    const comparison = compareMortgageSwitch(input);
    const current = summarize(150000, 3, 30);
    const switched = summarize(150000, 2.5, 30);

    expect(comparison.current.monthlyPayment).toBeCloseTo(current.monthlyPayment, 6);
    expect(comparison.current.interest).toBeCloseTo(current.totalInterest, 6);
    expect(comparison.current.fee).toBe(0);
    expect(comparison.current.expenses).toBeCloseTo(10 * 360, 6);
    expect(comparison.current.totalPaid).toBeCloseTo(current.totalPaid + 3600, 6);

    expect(comparison.switched.monthlyPayment).toBeCloseTo(switched.monthlyPayment, 6);
    expect(comparison.switched.interest).toBeCloseTo(switched.totalInterest, 6);
    expect(comparison.switched.fee).toBe(1500);
    expect(comparison.switched.totalPaid).toBeCloseTo(switched.totalPaid + 3600 + 1500, 6);

    expect(comparison.totalSaving).toBeCloseTo(
      comparison.current.totalPaid - comparison.switched.totalPaid,
      6,
    );
    expect(comparison.monthlySaving).toBeCloseTo(
      current.monthlyPayment - switched.monthlyPayment,
      6,
    );
  });

  it('calcula en cuántos meses se recupera la comisión con la cuota más baja', () => {
    const comparison = compareMortgageSwitch(input);
    expect(comparison.breakEvenMonths).toBe(Math.ceil(1500 / comparison.monthlySaving));
  });

  it('no hay recuperación si la cuota nueva no es más baja o no da tiempo', () => {
    expect(compareMortgageSwitch({ ...input, newRatePct: 3.5 }).breakEvenMonths).toBeNull();
    expect(compareMortgageSwitch({ ...input, fee: 1_000_000 }).breakEvenMonths).toBeNull();
  });

  it('no compensa si la comisión supera el ahorro en intereses', () => {
    const comparison = compareMortgageSwitch({ ...input, fee: 100_000 });
    expect(comparison.totalSaving).toBeLessThan(0);
  });

  it('redacta la conclusión según el ahorro total', () => {
    expect(switchVerdict(5000)).toBe(`Te compensa cambiar: ahorras ${eur.format(5000)} en total.`);
    expect(switchVerdict(-800)).toBe(
      `No te compensa cambiar: pagas ${eur.format(800)} más en total.`,
    );
    expect(switchVerdict(0)).toBe('Cambiar o seguir te cuesta lo mismo.');
  });
});

describe('pregunta de cambio de hipoteca', () => {
  beforeEach(() => renderChartMock.mockClear());

  function render(store = createStore()) {
    const question = questions.find((item) => item.id === 'cambio-hipoteca');
    if (!question) throw new Error('falta la pregunta de cambio de hipoteca');
    const container = document.createElement('div');
    question.render(container, { store });
    const field = <T extends HTMLElement = HTMLInputElement>(name: string) => {
      const el = container.querySelector<T>(`[data-switch-input="${name}"]`);
      if (!el) throw new Error(`falta el campo ${name}`);
      return el;
    };
    const value = (name: string) =>
      container.querySelector(`[data-switch-value="${name}"]`)?.textContent;
    const type = (name: string, text: string) => {
      const el = field(name);
      el.value = text;
      el.dispatchEvent(new Event('input'));
    };
    const choose = (unit: 'eur' | 'pct') => {
      const select = field<HTMLSelectElement>('feeUnit');
      select.value = unit;
      select.dispatchEvent(new Event('change'));
    };
    return { container, value, type, choose };
  }

  it('compara seguir con la hipoteca actual frente a cambiar', () => {
    const store = createStore();
    store.set({ fixedExpensesMonthly: 10 });
    const { container, value, type, choose } = render(store);

    type('remainingMonths', '360');
    type('newRate', '2.5');
    choose('eur');
    type('fee', '1500');

    const comparison = compareMortgageSwitch(input);
    for (const mode of ['current', 'switched'] as const) {
      const option = comparison[mode];
      expect(value(`${mode}-monthly-payment`)).toBe(eur.format(option.monthlyPayment));
      expect(value(`${mode}-total-paid`)).toBe(eur.format(option.totalPaid));
      expect(value(`${mode}-interest`)).toContain(eur.format(option.interest));
      expect(value(`${mode}-fee`)).toContain(eur.format(option.fee));
    }
    expect(container.querySelector('[data-switch-verdict]')?.textContent).toBe(
      switchVerdict(comparison.totalSaving),
    );
    expect(container.querySelector('[data-switch-break-even]')?.textContent).toContain(
      String(comparison.breakEvenMonths),
    );

    const config = renderChartMock.mock.lastCall?.[1] as {
      data: { labels: string[]; datasets: { label: string }[] };
    };
    expect(config.data.labels).toEqual(['Seguir con mi hipoteca', 'Cambiar de hipoteca']);
    expect(config.data.datasets.map((dataset) => dataset.label)).toEqual([
      'Capital',
      'Intereses',
      'Comisión',
      'Gastos fijos',
    ]);
  });

  it('interpreta la comisión como porcentaje del capital pendiente', () => {
    const { value, type, choose } = render();
    type('newRate', '2.5');
    choose('pct');
    type('fee', '1');
    expect(value('switched-fee')).toContain(eur.format(1500));
  });

  it('oculta los resultados si los datos de la pregunta no son válidos', () => {
    const { container, type } = render();
    const results = container.querySelector<HTMLElement>('[data-switch-results]');

    type('fee', '-5');
    expect(results?.hidden).toBe(true);
    expect(container.querySelector('[data-switch-error="fee"]')?.textContent).toBe(
      'La comisión no puede ser negativa.',
    );

    type('fee', '0');
    type('newRate', '25');
    expect(results?.hidden).toBe(true);

    type('newRate', '2');
    expect(results?.hidden).toBe(false);
  });

  it('calcula el capital pendiente a partir de las mensualidades que quedan', () => {
    const { container, value, type, choose } = render();
    type('remainingMonths', '246');
    type('newRate', '2.5');
    choose('pct');
    type('fee', '1');

    const pending = pendingBalance(150000, 3, 30, 246);
    expect(container.querySelector('[data-switch-pending]')?.textContent).toContain(
      eur.format(pending),
    );
    expect(value('current-principal')).toContain(eur.format(pending));
    expect(value('current-monthly-payment')).toBe(eur.format(monthlyPayment(150000, 3, 30)));
    expect(value('switched-fee')).toContain(eur.format(pending * 0.01));
    expect(value('current-total-paid')).toBe(
      eur.format(
        compareMortgageSwitch({
          ...input,
          principal: pending,
          years: 246 / 12,
          fixedExpensesMonthly: 0,
          fee: 0,
        }).current.totalPaid,
      ),
    );
  });

  it('exige mensualidades enteras dentro del plazo de la hipoteca', () => {
    const { container, type } = render();
    const results = container.querySelector<HTMLElement>('[data-switch-results]');
    type('newRate', '2');
    type('fee', '0');

    type('remainingMonths', '361');
    expect(results?.hidden).toBe(true);
    expect(container.querySelector('[data-switch-error="remainingMonths"]')?.textContent).toBe(
      'Debe ser un número entero entre 1 y 360 (las mensualidades de tu hipoteca).',
    );

    type('remainingMonths', '0');
    expect(results?.hidden).toBe(true);

    type('remainingMonths', '120.5');
    expect(results?.hidden).toBe(true);

    type('remainingMonths', '144');
    expect(results?.hidden).toBe(false);
  });
});
