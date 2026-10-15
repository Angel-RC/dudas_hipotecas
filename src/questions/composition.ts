import { type YearRow, aggregateByYear, buildSchedule } from '../calc/mortgage';
import { eur, pct } from '../format';
import { validate } from '../state';
import { renderChart } from '../ui/chart';
import type { Question } from './types';

const COLORS = {
  principal: '#DF0027',
  interest: '#526570',
  expenses: '#D6A33A',
  balance: '#77868D',
};

export type CompositionSeries = {
  labels: string[];
  principal: number[];
  interest: number[];
  expenses: number[];
  balance: number[];
};

export function compositionSeries(
  years: YearRow[],
  fixedExpensesMonthly = 0,
  totalMonths = years.length * 12,
): CompositionSeries {
  return {
    labels: years.map((y) => String(y.year)),
    principal: years.map((y) => y.principal),
    interest: years.map((y) => y.interest),
    expenses: years.map(
      (y) => fixedExpensesMonthly * Math.min(12, Math.max(totalMonths - (y.year - 1) * 12, 0)),
    ),
    balance: years.map((y) => y.balance),
  };
}

export function compositionTooltip(series: CompositionSeries, index: number) {
  const total = series.principal[index] + series.interest[index] + series.expenses[index];
  const hasExpenses = series.expenses[index] > 0;
  const share = (value: number) => (total > 0 ? (value / total) * 100 : 0);
  return {
    title: `Año ${series.labels[index]} · Cuota anual${hasExpenses ? ' + gastos' : ''} ${eur.format(total)}`,
    principal: `Principal: ${eur.format(series.principal[index])} (${pct.format(share(series.principal[index]))})`,
    interest: `Intereses: ${eur.format(series.interest[index])} (${pct.format(share(series.interest[index]))})`,
    expenses: `Gastos: ${eur.format(series.expenses[index])} (${pct.format(share(series.expenses[index]))})`,
    balance: `Capital pendiente: ${eur.format(series.balance[index])}`,
  };
}

export const compositionQuestion: Question = {
  id: 'composicion',
  title: '¿Cómo se reparte cada cuota?',
  summary: 'Distribución anual de los pagos y evolución del capital pendiente.',
  render(container, { store }) {
    const state = store.get();
    if (Object.keys(validate(state)).length > 0) {
      container.innerHTML = '<p class="text-danger">Corrige los datos para ver los resultados.</p>';
      return;
    }
    const schedule = buildSchedule(state.principal, state.rate, state.years);
    const series = compositionSeries(
      aggregateByYear(schedule),
      state.fixedExpensesMonthly,
      schedule.length,
    );
    const hasExpenses = state.fixedExpensesMonthly > 0;
    container.innerHTML = `
      <p class="mb-4 text-sm text-muted">
        Las barras separan principal, intereses${hasExpenses ? ' y gastos fijos anuales' : ''}.
        La línea muestra el capital pendiente.
      </p>
      <div data-chart class="h-96 rounded-3xl bg-panel p-4 shadow-sm md:p-6"></div>`;
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
          ...(hasExpenses
            ? [
                {
                  label: 'Gastos',
                  data: series.expenses,
                  backgroundColor: COLORS.expenses,
                  stack: 'cuota',
                  yAxisID: 'y',
                },
              ]
            : []),
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
        color: '#526570',
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (items) =>
                items.length > 0 ? compositionTooltip(series, items[0].dataIndex).title : '',
              label: (item) => {
                const tip = compositionTooltip(series, item.dataIndex);
                if (item.dataset.label === 'Principal') return tip.principal;
                if (item.dataset.label === 'Intereses') return tip.interest;
                if (item.dataset.label === 'Gastos') return tip.expenses;
                return tip.balance;
              },
            },
          },
        },
        scales: {
          y: {
            stacked: true,
            title: {
              display: true,
              text: `Cuota anual${hasExpenses ? ' + gastos' : ''} (€)`,
              color: '#2D373D',
            },
            ticks: { color: '#526570' },
            grid: { color: '#DDE3E6' },
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'Capital pendiente (€)', color: '#2D373D' },
            ticks: { color: '#526570' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  },
};
