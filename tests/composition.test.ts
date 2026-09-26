import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aggregateByYear, buildSchedule } from '../src/calc/mortgage';
import { questions } from '../src/questions';
import { compositionSeries } from '../src/questions/composition';
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
});

describe('pregunta composición', () => {
  beforeEach(() => {
    renderChartMock.mockClear();
  });

  it('renderiza una gráfica con principal, intereses y capital pendiente', () => {
    const store = createStore();
    const container = document.createElement('div');
    compositionQuestion().render(container, { store });
    expect(renderChartMock).toHaveBeenCalledTimes(1);
    const config = renderChartMock.mock.calls[0][1] as {
      data: { datasets: Array<{ label: string }> };
    };
    expect(config.data.datasets.map((d) => d.label)).toEqual([
      'Principal',
      'Intereses',
      'Capital pendiente',
    ]);
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
