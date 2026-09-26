import { aggregateByYear, summarize } from '../calc/mortgage';
import { eur, pct } from '../format';
import { validate } from '../state';
import { renderCards } from '../ui/cards';
import { renderTable } from '../ui/table';
import type { Question } from './types';

export const monthlyPaymentQuestion: Question = {
  id: 'cuota',
  title: '¿Cuánto pago al mes y en total?',
  summary: 'Cuota mensual, intereses totales, total pagado y cuadro anual.',
  render(container, { store }) {
    const state = store.get();
    if (Object.keys(validate(state)).length > 0) {
      container.innerHTML = '<p class="text-danger">Corrige los datos para ver los resultados.</p>';
      return;
    }
    const summary = summarize(state.principal, state.rate, state.years);
    const cards = document.createElement('div');
    const table = document.createElement('div');
    table.className = 'mt-4';
    container.innerHTML = '<h2 class="mb-3 text-lg font-semibold">Cuota mensual y coste total</h2>';
    container.append(cards, table);
    renderCards(cards, [
      { label: 'Cuota mensual', value: eur.format(summary.monthlyPayment) },
      { label: 'Intereses totales', value: eur.format(summary.totalInterest) },
      { label: 'Total pagado', value: eur.format(summary.totalPaid) },
      { label: '% intereses', value: pct.format(summary.interestPct) },
    ]);
    renderTable(
      table,
      [
        'Año',
        'Cuota anual',
        'Intereses',
        'Principal',
        'Capital pendiente',
        'Intereses acum.',
        'Principal acum.',
      ],
      aggregateByYear(summary.months).map((r) => [
        String(r.year),
        eur.format(r.payment),
        eur.format(r.interest),
        eur.format(r.principal),
        eur.format(r.balance),
        eur.format(r.cumInterest),
        eur.format(r.cumPrincipal),
      ]),
    );
  },
};
