import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aggregateByYear, buildSchedule } from '../src/calc/mortgage';
import { questions } from '../src/questions';
import { compositionSeries, compositionTooltip } from '../src/questions/composition';
import { createStore } from '../src/state';

const { renderChartMock } = vi.hoisted(() => ({ renderChartMock: vi.fn() }));

vi.mock('../src/ui/chart', () => ({ renderChart: renderChartMock }));

function compositionQuestion() {
  const question = questions.find((q) => q.id === 'composicion');
  if (!question) throw new Error('falta la pregunta de composición');
  return question;
}

describe('compositionSeries', () => {
  it('extrae etiquetas y series por año del cuadro de amortización', () => {
    const series = compositionSeries(aggregateByYear(buildSchedule(150000, 3, 30)));
    expect(series.labels).toHaveLength(30);
    expect(series.labels[0]).toBe('1');
    expect(series.labels[29]).toBe('30');
    expect(series.interest[0]).toBeCloseTo(4457.17, 1);
    expect(series.principal[0]).toBeCloseTo(3131.7, 1);
    expect(series.balance[0]).toBeCloseTo(146868.3, 0);
    expect(series.interest[29]).toBeCloseTo(121.89, 1);
    expect(series.principal[29]).toBeCloseTo(7466.98, 1);
    expect(series.balance[29]).toBeCloseTo(0, 6);
    expect(series.principal.reduce((a, v) => a + v, 0)).toBeCloseTo(150000, 1);
    expect(series.interest.reduce((a, v) => a + v, 0)).toBeCloseTo(77666.18, 1);
  });

  it('calcula los gastos anuales y prorratea el último año incompleto', () => {
    const schedule = buildSchedule(150000, 3, 1.5);
    const series = compositionSeries(aggregateByYear(schedule), 100, schedule.length);

    expect(series.expenses).toEqual([1200, 600]);
  });
});

describe('compositionTooltip', () => {
  it('muestra el importe y el porcentaje de la cuota anual de cada año', () => {
    const series = compositionSeries(aggregateByYear(buildSchedule(150000, 3, 30)));
    const tip = compositionTooltip(series, 0);
    expect(tip.title).toContain('Año 1');
    expect(tip.title).toContain('7.588,87');
    expect(tip.title).not.toMatch(/gastos/i);
    expect(tip.principal).toContain('3.131,70');
    expect(tip.principal).toContain('41,3');
    expect(tip.interest).toContain('4.457,17');
    expect(tip.interest).toContain('58,7');
    expect(tip.balance).toContain('146.868,30');
  });

  it('incluye gastos fijos en el total anual y en los porcentajes', () => {
    const schedule = buildSchedule(150000, 3, 30);
    const series = compositionSeries(aggregateByYear(schedule), 100, schedule.length);
    const tip = compositionTooltip(series, 0);

    expect(tip.title).toContain('8.788,87');
    expect(tip.principal).toContain('35,6');
    expect(tip.interest).toContain('50,7');
    expect(tip.expenses).toContain('1.200,00');
    expect(tip.expenses).toContain('13,7');
  });
});

describe('pregunta composición', () => {
  beforeEach(() => {
    renderChartMock.mockClear();
  });

  it('renderiza una gráfica con principal, intereses, gastos y capital pendiente', () => {
    const store = createStore();
    store.set({ fixedExpensesMonthly: 100 });
    const container = document.createElement('div');
    compositionQuestion().render(container, { store });
    expect(renderChartMock).toHaveBeenCalledTimes(1);
    const config = renderChartMock.mock.calls[0][1] as {
      data: { datasets: Array<{ label: string; data: number[] }> };
      options: { scales: { y: { title: { text: string } } } };
    };
    expect(config.data.datasets.map((d) => d.label)).toEqual([
      'Principal',
      'Intereses',
      'Gastos',
      'Capital pendiente',
    ]);
    expect(config.data.datasets[2].data[0]).toBe(1200);
    expect(config.options.scales.y.title.text).toBe('Cuota anual + gastos (€)');
  });

  it('oculta gastos del texto y la gráfica cuando el importe es cero', () => {
    const store = createStore();
    const container = document.createElement('div');
    const question = compositionQuestion();
    question.render(container, { store });

    const config = renderChartMock.mock.calls[0][1] as {
      data: { datasets: Array<{ label: string }> };
      options: { scales: { y: { title: { text: string } } } };
    };
    expect(question.summary).not.toMatch(/gastos/i);
    expect(container.textContent).not.toMatch(/gastos/i);
    expect(config.data.datasets.map((dataset) => dataset.label)).toEqual([
      'Principal',
      'Intereses',
      'Capital pendiente',
    ]);
    expect(config.options.scales.y.title.text).toBe('Cuota anual (€)');
  });

  it('pide corregir los datos si son inválidos y no dibuja', () => {
    const store = createStore();
    store.set({ years: Number.NaN });
    const container = document.createElement('div');
    compositionQuestion().render(container, { store });
    expect(container.textContent).toContain('Corrige');
    expect(renderChartMock).not.toHaveBeenCalled();
  });
});
