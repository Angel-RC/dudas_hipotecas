import { Chart, type ChartConfiguration } from 'chart.js/auto';

export function destroyCharts(container: HTMLElement): void {
  for (const canvas of container.querySelectorAll('canvas')) {
    Chart.getChart(canvas)?.destroy();
  }
}

export function renderChart(container: HTMLElement, config: ChartConfiguration): void {
  Chart.defaults.font.family = 'DM Sans, Helvetica, Arial, sans-serif';
  Chart.defaults.color = '#526570';
  destroyCharts(container);
  container.innerHTML = '<canvas></canvas>';
  const canvas = container.querySelector('canvas');
  if (!canvas) throw new Error('No se pudo crear el canvas de la gráfica');
  new Chart(canvas, config);
}
