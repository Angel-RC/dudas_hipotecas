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
    const hasExpenses = state.fixedExpensesMonthly > 0;
    const totalFixedExpenses = state.fixedExpensesMonthly * state.years * 12;
    const totalPaid = summary.totalPaid + totalFixedExpenses;
    const interestAndExpenses = summary.totalInterest + totalFixedExpenses;
    const interestPct = totalPaid > 0 ? (interestAndExpenses / totalPaid) * 100 : 0;
    const cards = document.createElement('div');
    const table = document.createElement('div');
    table.className = 'mt-4';
    container.innerHTML = '';
    container.append(cards, table);
    renderCards(cards, [
      {
        label: hasExpenses ? 'Cuota mensual + gastos' : 'Cuota mensual',
        value: eur.format(summary.monthlyPayment + state.fixedExpensesMonthly),
      },
      { label: 'Total pagado', value: eur.format(totalPaid) },
      {
        label: hasExpenses ? 'Intereses + gastos fijos' : 'Intereses totales',
        value: eur.format(interestAndExpenses),
      },
      {
        label: hasExpenses ? '% intereses + gastos' : '% intereses',
        value: pct.format(interestPct),
      },
    ]);
    renderTable(
      table,
      [
        'Año',
        hasExpenses ? 'Cuota anual + gastos' : 'Cuota anual',
        'Intereses',
        'Principal',
        'Capital pendiente',
        hasExpenses ? 'Intereses + gastos acum.' : 'Intereses acum.',
        'Principal acum.',
      ],
      aggregateByYear(summary.months).map((r) => {
        const annualExpenses = state.fixedExpensesMonthly * 12;
        const annualPayment = r.payment + (hasExpenses ? annualExpenses : 0);
        const row = [String(r.year), eur.format(annualPayment)];
        row.push(
          eur.format(r.interest),
          eur.format(r.principal),
          eur.format(r.balance),
          eur.format(
            r.cumInterest +
              state.fixedExpensesMonthly * Math.min(r.year * 12, summary.months.length),
          ),
          eur.format(r.cumPrincipal),
        );
        return row;
      }),
    );
  },
};
