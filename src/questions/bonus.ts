import { type BonusOption, compareBonusedProducts } from '../calc/mortgage';
import {
  eur,
  numberWithGrouping,
  numberWithoutGrouping,
  parseLocalizedNumber,
  pct,
} from '../format';
import { validate } from '../state';
import { renderChart } from '../ui/chart';
import type { Question } from './types';

const COLORS = {
  principal: '#DF0027',
  interest: '#526570',
  expenses: '#D6A33A',
};

type Settings = { bonusedRate: number; bankProducts: number; externalProducts: number };
type Mode = 'unbonused' | 'bonused';

let rememberedSettings: Settings | undefined;

function must<T extends HTMLElement>(value: T | null): T {
  if (!value) throw new Error('No se encontró un control de bonificación');
  return value;
}

function share(value: number, total: number): string {
  return `${eur.format(value)} (${pct.format(total > 0 ? (value / total) * 100 : 0)})`;
}

function groupedInput(name: string, label: string, value: number): string {
  return `
    <label class="flex flex-col gap-1 text-sm font-semibold">${label}
      <input data-bonus-input="${name}" type="text" inputmode="decimal" data-grouped-number autocomplete="off"
        value="${Number.isFinite(value) ? numberWithGrouping.format(value) : ''}"
        class="rounded-xl border border-line bg-white px-4 py-3 text-right tabular-nums font-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
      <span data-bonus-error="${name}" class="min-h-[1em] text-xs text-danger"></span>
    </label>`;
}

function scenarioMarkup(mode: Mode, title: string, description: string): string {
  return `
    <article data-bonus-scenario="${mode}" class="min-w-0 py-1">
      <h3 class="mb-1 text-lg font-semibold">${title}</h3>
      <p class="mb-4 text-sm text-muted">${description}</p>
      <dl class="space-y-3">
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">Cuota mensual con productos y gastos</dt>
          <dd data-bonus-value="${mode}-monthly-total" class="text-xl font-semibold"></dd>
        </div>
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">Gasto anual</dt>
          <dd data-bonus-value="${mode}-annual-total" class="text-xl font-semibold"></dd>
        </div>
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">Total pagado en toda la hipoteca</dt>
          <dd data-bonus-value="${mode}-total-paid" class="text-xl font-semibold"></dd>
        </div>
        <div class="border-t border-line pt-3">
          <div class="flex justify-between gap-3 text-sm">
            <dt>Cuota de la hipoteca</dt>
            <dd data-bonus-value="${mode}-monthly-payment" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Principal</dt>
            <dd data-bonus-value="${mode}-principal" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Intereses</dt>
            <dd data-bonus-value="${mode}-interest" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Gastos y productos</dt>
            <dd data-bonus-value="${mode}-expenses" class="text-right font-medium"></dd>
          </div>
        </div>
      </dl>
    </article>`;
}

export function bonusVerdict(totalSaving: number, monthlySaving: number): string {
  if (Math.abs(totalSaving) < 0.005) return 'Las dos opciones te cuestan lo mismo.';
  if (totalSaving > 0) {
    return `La bonificada te compensa: ahorras ${eur.format(totalSaving)} en total (${eur.format(monthlySaving)} al mes).`;
  }
  return `La bonificada no te compensa: pagas ${eur.format(-totalSaving)} más en total (${eur.format(-monthlySaving)} al mes).`;
}

export const bonusQuestion: Question = {
  id: 'bonificaciones',
  title: '¿Me compensan los productos bonificados?',
  summary: 'Compara la hipoteca bonificada con sus productos frente a la hipoteca sin bonificar.',
  render(container, { store }) {
    const state = store.get();
    rememberedSettings ??= {
      bonusedRate: Math.max(Math.round((state.rate - 0.5) * 100) / 100, 0),
      bankProducts: 0,
      externalProducts: 0,
    };
    const settings = rememberedSettings;
    const hasFixedExpenses = state.fixedExpensesMonthly > 0;

    container.innerHTML = `
      <p class="mb-4 text-sm text-muted">
        El interés de tu hipoteca se toma como el interés sin bonificar. Indica el interés que te
        ofrecen a cambio de contratar sus productos, lo que te cuestan al mes y lo que te costarían
        los productos que contratarías igualmente con otra entidad.${
          hasFixedExpenses ? ' Los gastos fijos se suman a las dos opciones.' : ''
        }
      </p>
      <div class="mb-5 grid gap-4 sm:grid-cols-3">
        <label class="flex flex-col gap-1 text-sm font-semibold">Interés bonificado TIN (%)
          <input data-bonus-input="bonusedRate" type="number" min="0" max="20" step="0.05"
            value="${Number.isFinite(settings.bonusedRate) ? settings.bonusedRate : ''}"
            class="rounded-xl border border-line bg-white px-4 py-3 text-right tabular-nums font-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
          <span data-bonus-error="bonusedRate" class="min-h-[1em] text-xs text-danger"></span>
        </label>
        ${groupedInput('bankProducts', 'Coste de los productos con el banco (€ al mes)', settings.bankProducts)}
        ${groupedInput('externalProducts', 'Coste de los productos contratados fuera (€ al mes)', settings.externalProducts)}
      </div>
      <p data-global-error class="mb-4 text-sm text-danger"></p>
      <div data-bonus-results>
        <p data-bonus-verdict class="mb-5 text-lg font-semibold"></p>
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          ${scenarioMarkup('unbonused', 'Sin bonificar', 'Interés base y productos contratados fuera.')}
          <div aria-hidden="true" class="border-t border-line lg:border-t-0 lg:border-l"></div>
          ${scenarioMarkup('bonused', 'Bonificada', 'Interés rebajado y productos del banco.')}
        </div>
        <div data-bonus-chart class="mt-6 h-80 rounded-3xl bg-panel p-4 shadow-sm md:p-6"></div>
      </div>`;

    const inputs = {
      bonusedRate: must(
        container.querySelector<HTMLInputElement>('[data-bonus-input="bonusedRate"]'),
      ),
      bankProducts: must(
        container.querySelector<HTMLInputElement>('[data-bonus-input="bankProducts"]'),
      ),
      externalProducts: must(
        container.querySelector<HTMLInputElement>('[data-bonus-input="externalProducts"]'),
      ),
    };
    const globalError = must(container.querySelector<HTMLElement>('[data-global-error]'));
    const results = must(container.querySelector<HTMLElement>('[data-bonus-results]'));
    const verdict = must(container.querySelector<HTMLElement>('[data-bonus-verdict]'));
    const chart = must(container.querySelector<HTMLElement>('[data-bonus-chart]'));

    function setValue(name: string, value: string): void {
      must(container.querySelector<HTMLElement>(`[data-bonus-value="${name}"]`)).textContent =
        value;
    }

    function setError(name: keyof Settings, message: string): void {
      must(container.querySelector<HTMLElement>(`[data-bonus-error="${name}"]`)).textContent =
        message;
      inputs[name].setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function showOption(mode: Mode, option: BonusOption): void {
      setValue(`${mode}-monthly-total`, eur.format(option.monthlyTotal));
      setValue(`${mode}-annual-total`, eur.format(option.annualTotal));
      setValue(`${mode}-total-paid`, eur.format(option.totalPaid));
      setValue(`${mode}-monthly-payment`, eur.format(option.monthlyPayment));
      setValue(`${mode}-principal`, share(option.principal, option.totalPaid));
      setValue(`${mode}-interest`, share(option.interest, option.totalPaid));
      setValue(`${mode}-expenses`, share(option.expenses, option.totalPaid));
    }

    function updateResults(): void {
      const raw = inputs.bonusedRate.value.trim();
      const next: Settings = {
        bonusedRate: raw === '' ? Number.NaN : Number(raw),
        bankProducts: parseLocalizedNumber(inputs.bankProducts.value),
        externalProducts: parseLocalizedNumber(inputs.externalProducts.value),
      };
      rememberedSettings = next;

      const rateError =
        next.bonusedRate >= 0 && next.bonusedRate <= 20
          ? ''
          : 'El interés debe estar entre 0 y 20.';
      const costError = 'El coste no puede ser negativo.';
      setError('bonusedRate', rateError);
      setError('bankProducts', next.bankProducts >= 0 ? '' : costError);
      setError('externalProducts', next.externalProducts >= 0 ? '' : costError);

      if (Object.keys(validate(state)).length > 0) {
        globalError.textContent = 'Corrige los datos de la hipoteca para ver la comparación.';
        results.hidden = true;
        return;
      }
      globalError.textContent = '';
      if (rateError || !(next.bankProducts >= 0) || !(next.externalProducts >= 0)) {
        results.hidden = true;
        return;
      }

      const comparison = compareBonusedProducts({
        principal: state.principal,
        years: state.years,
        baseRatePct: state.rate,
        bonusedRatePct: next.bonusedRate,
        fixedExpensesMonthly: state.fixedExpensesMonthly,
        bankProductsMonthly: next.bankProducts,
        externalProductsMonthly: next.externalProducts,
      });
      results.hidden = false;
      verdict.textContent = bonusVerdict(comparison.totalSaving, comparison.monthlySaving);
      showOption('unbonused', comparison.unbonused);
      showOption('bonused', comparison.bonused);

      const options = [comparison.unbonused, comparison.bonused];
      renderChart(chart, {
        type: 'bar',
        data: {
          labels: ['Sin bonificar', 'Bonificada'],
          datasets: [
            {
              label: 'Principal',
              data: options.map((option) => option.principal),
              backgroundColor: COLORS.principal,
            },
            {
              label: 'Intereses',
              data: options.map((option) => option.interest),
              backgroundColor: COLORS.interest,
            },
            {
              label: 'Gastos y productos',
              data: options.map((option) => option.expenses),
              backgroundColor: COLORS.expenses,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          color: '#526570',
          plugins: {
            tooltip: {
              callbacks: {
                label: (item) =>
                  `${item.dataset.label}: ${share(
                    Number(item.raw),
                    options[item.dataIndex].totalPaid,
                  )}`,
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              title: { display: true, text: 'Total pagado (€)', color: '#2D373D' },
              ticks: { color: '#526570' },
              grid: { color: '#DDE3E6' },
            },
            y: { stacked: true, ticks: { color: '#526570' }, grid: { display: false } },
          },
        },
      });
    }

    for (const input of [inputs.bankProducts, inputs.externalProducts]) {
      input.addEventListener('focus', () => {
        const value = parseLocalizedNumber(input.value);
        input.value = Number.isFinite(value) ? numberWithoutGrouping.format(value) : '';
      });
      input.addEventListener('blur', () => {
        const value = parseLocalizedNumber(input.value);
        if (Number.isFinite(value)) input.value = numberWithGrouping.format(value);
      });
    }
    for (const input of Object.values(inputs)) input.addEventListener('input', updateResults);
    updateResults();
  },
};
