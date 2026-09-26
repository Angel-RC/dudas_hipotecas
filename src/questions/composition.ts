import { type YearRow, aggregateByYear, buildSchedule } from '../calc/mortgage';
import { validate } from '../state';
import { renderChart } from '../ui/chart';
import type { Question } from './types';

const COLORS = {
  principal: '#2f6df6',
  interest: '#f0713a',
  balance: '#7a3df0',
};

export type CompositionSeries = {
  labels: string[];
  principal: number[];
  interest: number[];
  balance: number[];
};

export function compositionSeries(years: YearRow[]): CompositionSeries {
  return {
    labels: years.map((y) => String(y.year)),
    principal: years.map((y) => y.principal),
    interest: years.map((y) => y.interest),
    balance: years.map((y) => y.balance),
  };
}

export const compositionQuestion: Question = {
  id: 'composicion',
  title: '¿Cómo se reparte cada cuota?',
  summary: 'Barras anuales de principal e intereses, con el capital pendiente.',
  render(container, { store }) {
    const state = store.get();
    if (Object.keys(validate(state)).length > 0) {
      container.innerHTML = '<p class="text-danger">Corrige los datos para ver los resultados.</p>';
      return;
    }
    const series = compositionSeries(
      aggregateByYear(buildSchedule(state.principal, state.rate, state.years)),
    );
    container.innerHTML = `
      <h2 class="mb-3 text-lg font-semibold">Composición de la cuota</h2>
      <p class="mb-4 text-sm text-muted">
        Al principio casi todo lo que pagas son intereses; al final, casi todo es principal.
        La línea muestra el capital pendiente.
      </p>
      <div data-chart class="h-80 rounded-xl border border-line bg-panel p-4"></div>`;
    const chartContainer = container.querySelector<HTMLElement>('[data-chart]');
    if (!chartContainer) throw new Error('No se encontró el contenedor de la gráfica');
    renderChart(chartContainer, {
      type: 'bar',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Principal',
            data: series.principal,
            backgroundColor: COLORS.principal,
            stack: 'cuota',
            yAxisID: 'y',
          },
          {
            label: 'Intereses',
            data: series.interest,
            backgroundColor: COLORS.interest,
            stack: 'cuota',
            yAxisID: 'y',
          },
          {
            label: 'Capital pendiente',
            data: series.balance,
            type: 'line',
            borderColor: COLORS.balance,
            backgroundColor: COLORS.balance,
            pointRadius: 0,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { stacked: true, title: { display: true, text: 'Cuota anual (€)' } },
          y1: {
            position: 'right',
            title: { display: true, text: 'Capital pendiente (€)' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  },
};
