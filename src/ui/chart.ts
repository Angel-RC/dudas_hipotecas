import { Chart, type ChartConfiguration } from 'chart.js/auto';

export function renderChart(container: HTMLElement, config: ChartConfiguration): void {
  container.innerHTML = '<canvas></canvas>';
  const canvas = container.querySelector('canvas');
  if (!canvas) throw new Error('No se pudo crear el canvas de la gráfica');
  new Chart(canvas, config);
}
