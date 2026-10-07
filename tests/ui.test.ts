import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/state';
import { renderCards } from '../src/ui/cards';
import { destroyCharts, renderChart } from '../src/ui/chart';
import { renderCommonInputs } from '../src/ui/inputs';
import { renderTable } from '../src/ui/table';

const { chartConstructorMock, chartDefaultsMock, chartDestroyMock, getChartMock } = vi.hoisted(
  () => ({
    chartConstructorMock: vi.fn(),
    chartDefaultsMock: { color: '#000000', font: { family: 'Arial' } },
    chartDestroyMock: vi.fn(),
    getChartMock: vi.fn(),
  }),
);

vi.mock('chart.js/auto', () => ({
  Chart: class {
    static defaults = chartDefaultsMock;
    static getChart = getChartMock;

    constructor(...args: unknown[]) {
      chartConstructorMock(...args);
    }
  },
}));

afterEach(() => {
  chartConstructorMock.mockReset();
  chartDestroyMock.mockReset();
  getChartMock.mockReset();
  chartDefaultsMock.color = '#000000';
  chartDefaultsMock.font.family = 'Arial';
});

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
        ['1', '3.131,70 €'],
        ['3', '146.868,30 €'],
      ],
    );
    expect(el.querySelectorAll('thead th')).toHaveLength(2);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(el.querySelector('.overflow-x-auto')?.className).not.toContain('border');
    const values = el.querySelectorAll<HTMLElement>('[data-table-value="1"]');
    expect(values).toHaveLength(2);
    expect(values[0].className).toContain('font-mono');
    expect(values[0].style.width).toBe(values[1].style.width);
  });
});

describe('chart', () => {
  it('aplica DM Sans también a los gráficos sobre canvas', () => {
    const el = document.createElement('div');
    chartDefaultsMock.font.family = 'Arial';

    renderChart(el, { type: 'line', data: { labels: [], datasets: [] } });

    expect(chartDefaultsMock.color).toBe('#526570');
    expect(chartDefaultsMock.font.family).toBe('DM Sans, Helvetica, Arial, sans-serif');
  });

  it('destruye el gráfico anterior al volver a renderizar el mismo contenedor', () => {
    const el = document.createElement('div');
    getChartMock.mockReturnValue({ destroy: chartDestroyMock });

    const config = { type: 'line' as const, data: { labels: [], datasets: [] } };
    renderChart(el, config);
    renderChart(el, config);

    expect(chartDestroyMock).toHaveBeenCalledTimes(1);
    expect(chartConstructorMock).toHaveBeenCalledTimes(2);
  });

  it('destruye los gráficos contenidos antes de desmontar una sección', () => {
    const el = document.createElement('div');
    getChartMock.mockReturnValue({ destroy: chartDestroyMock });
    renderChart(el, { type: 'line', data: { labels: [], datasets: [] } });

    destroyCharts(el);

    expect(chartDestroyMock).toHaveBeenCalledTimes(1);
  });
});

describe('inputs comunes', () => {
  it('renderiza los tres campos y actualiza el store', () => {
    const el = document.createElement('div');
    const store = createStore();
    renderCommonInputs(el, store);
    const input = must(el.querySelector<HTMLInputElement>('input[data-key="principal"]'));
    expect(el.querySelector('h2')?.textContent).toBe('Información de mi hipoteca');
    expect(input.type).toBe('text');
    expect(input.value).toBe('150.000');
    expect(input.className).toContain('tabular-nums');
    expect(input).toBeTruthy();
    input.dispatchEvent(new Event('focus'));
    expect(input.value).toBe('150000');
    input.value = '200000';
    input.dispatchEvent(new Event('input'));
    expect(store.get().principal).toBe(200000);
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('200.000');
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
