import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/state';
import { renderCards } from '../src/ui/cards';
import { destroyCharts, renderChart } from '../src/ui/chart';
import { renderCommonInputs } from '../src/ui/inputs';
import { renderTable } from '../src/ui/table';

const { chartConstructorMock, chartDestroyMock, getChartMock } = vi.hoisted(() => ({
  chartConstructorMock: vi.fn(),
  chartDestroyMock: vi.fn(),
  getChartMock: vi.fn(),
}));

vi.mock('chart.js/auto', () => ({
  Chart: class {
    static getChart = getChartMock;

    constructor(...args: unknown[]) {
      chartConstructorMock(...args);
    }
  },
}));

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Elemento no encontrado');
  return value;
}

describe('cards', () => {
  it('renderiza etiquetas y valores', () => {
    const el = document.createElement('div');
    renderCards(el, [{ label: 'Cuota', value: '632,41 €' }]);
    expect(el.textContent).toContain('Cuota');
    expect(el.textContent).toContain('632,41 €');
    expect(el.querySelector('.grid > div')?.className).not.toContain('border');
  });
});

describe('table', () => {
  it('renderiza cabeceras y filas', () => {
    const el = document.createElement('div');
    renderTable(
      el,
      ['A', 'B'],
      [
        ['1', '2'],
        ['3', '4'],
      ],
    );
    expect(el.querySelectorAll('thead th')).toHaveLength(2);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(el.querySelector('.overflow-x-auto')?.className).not.toContain('border');
  });
});

describe('chart', () => {
  it('destruye el gráfico anterior al volver a renderizar el mismo contenedor', () => {
    const el = document.createElement('div');
    getChartMock.mockReturnValue({ destroy: chartDestroyMock });

    const config = { type: 'line' as const, data: { labels: [], datasets: [] } };
    renderChart(el, config);
    renderChart(el, config);

    expect(chartDestroyMock).toHaveBeenCalledTimes(1);
    expect(chartConstructorMock).toHaveBeenCalledTimes(2);
    getChartMock.mockReset();
    chartDestroyMock.mockReset();
    chartConstructorMock.mockReset();
  });

  it('destruye los gráficos contenidos antes de desmontar una sección', () => {
    const el = document.createElement('div');
    getChartMock.mockReturnValue({ destroy: chartDestroyMock });
    renderChart(el, { type: 'line', data: { labels: [], datasets: [] } });

    destroyCharts(el);

    expect(chartDestroyMock).toHaveBeenCalledTimes(1);
    getChartMock.mockReset();
    chartDestroyMock.mockReset();
    chartConstructorMock.mockReset();
  });
});

describe('inputs comunes', () => {
  it('renderiza los tres campos y actualiza el store', () => {
    const el = document.createElement('div');
    const store = createStore();
    renderCommonInputs(el, store);
    const input = must(el.querySelector<HTMLInputElement>('input[data-key="principal"]'));
    expect(input).toBeTruthy();
    input.value = '200000';
    input.dispatchEvent(new Event('input'));
    expect(store.get().principal).toBe(200000);
  });

  it('trata un campo vacío como inválido (NaN) y muestra el error', () => {
    const el = document.createElement('div');
    const store = createStore();
    renderCommonInputs(el, store);
    const input = must(el.querySelector<HTMLInputElement>('input[data-key="rate"]'));
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(Number.isNaN(store.get().rate)).toBe(true);
    expect(must(el.querySelector('[data-error="rate"]')).textContent).not.toBe('');
  });
});
