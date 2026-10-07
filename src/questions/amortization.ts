import { buildSchedule, compareAmortizationAtYear } from '../calc/mortgage';
import {
  eur,
  numberWithGrouping,
  numberWithoutGrouping,
  parseLocalizedNumber,
  pct,
} from '../format';
import { validate } from '../state';
import type { Question } from './types';

type Settings = { amount: number; year: number };

let rememberedSettings: Settings | undefined;

function must<T extends HTMLElement>(value: T | null): T {
  if (!value) throw new Error('No se encontró un control de amortización');
  return value;
}

function duration(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`);
  }
  return parts.length > 0 ? parts.join(' y ') : 'Cancelada';
}

function scenarioMarkup(
  mode: 'current' | 'term' | 'payment',
  title: string,
  description: string,
): string {
  const totalPaidLabel =
    mode === 'current'
      ? 'Total que pagarías sin amortizar'
      : 'Total que pagarás, incluida la amortización';
  return `
    <article data-amortization-scenario="${mode}" class="min-w-0 py-1">
      <h3 class="mb-1 text-lg font-semibold">${title}</h3>
      <p class="mb-4 text-sm text-muted">${description}</p>
      <dl class="space-y-3">
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">Cuota fija mensual tras amortizar</dt>
          <dd data-amortization-value="${mode}-monthly-payment" class="text-xl font-semibold"></dd>
        </div>
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">Intereses ahorrados</dt>
          <dd data-amortization-value="${mode}-interest-saved" class="text-xl font-semibold text-accent"></dd>
        </div>
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">${totalPaidLabel}</dt>
          <dd data-amortization-value="${mode}-total-paid" class="text-xl font-semibold"></dd>
        </div>
        <div class="border-t border-line pt-3">
          <div class="flex justify-between gap-3 text-sm">
            <dt>Principal devuelto</dt>
            <dd data-amortization-value="${mode}-principal-composition" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Intereses totales</dt>
            <dd data-amortization-value="${mode}-total-interest" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Plazo desde hoy hasta cancelar</dt>
            <dd data-amortization-value="${mode}-payoff-duration" class="text-right font-medium"></dd>
          </div>
        </div>
      </dl>
    </article>`;
}

export const amortizationQuestion: Question = {
  id: 'amortizacion',
  title: '¿Me interesa amortizar?',
  summary: 'Compara cuánto pagarías al reducir plazo o cuota con una amortización parcial.',
  render(container, { store }) {
    const state = store.get();
    const monthCount = Math.round(state.years * 12);
    const maxYear = Math.max(0, Math.floor((monthCount - 1) / 12));
    rememberedSettings ??= { amount: Math.round(state.principal * 0.1), year: 0 };
    const settings = rememberedSettings;
    const selectedYear = Math.min(settings.year, maxYear);
    const yearOptions = Array.from({ length: maxYear + 1 }, (_, year) => {
      const label = year === 0 ? 'Hoy' : `Dentro de ${year} ${year === 1 ? 'año' : 'años'}`;
      return `<option value="${year}"${year === selectedYear ? ' selected' : ''}>${label}</option>`;
    }).join('');

    container.innerHTML = `
      <p class="mb-4 text-sm text-muted">
        Indica cuánto quieres amortizar y cuándo. Comparamos tu situación actual con dos opciones,
        contando las cuotas previas a la amortización y el importe extra como devolución de principal.
        Los porcentajes muestran qué parte del total pagado corresponde a principal e intereses.
      </p>
      <div class="mb-5 grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm font-semibold">Importe de la amortización (€)
          <input data-amortization-amount type="text" inputmode="decimal" data-grouped-number autocomplete="off"
            value="${Number.isFinite(settings.amount) ? numberWithGrouping.format(settings.amount) : ''}"
            class="rounded-xl border border-line bg-white px-4 py-3 text-right tabular-nums font-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
          <span data-amortization-amount-error class="min-h-[1em] text-xs text-danger"></span>
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">¿Cuándo amortizas?
          <select data-amortization-year
            class="rounded-xl border border-line bg-white px-4 py-3 font-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
            ${yearOptions}
          </select>
        </label>
      </div>
      <p data-amortization-date-summary class="mb-4 text-sm text-muted"></p>
      <p data-global-error class="mb-4 text-sm text-danger"></p>
      <div data-amortization-results class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_1px_minmax(0,1fr)]">
        ${scenarioMarkup('current', 'Situación actual', 'Mantienes la cuota y no amortizas capital extra.')}
        <div data-amortization-divider aria-hidden="true" class="border-t border-line lg:border-t-0 lg:border-l"></div>
        ${scenarioMarkup('term', 'Reducir plazo', 'Mantienes la cuota actual y terminas antes.')}
        <div data-amortization-divider aria-hidden="true" class="border-t border-line lg:border-t-0 lg:border-l"></div>
        ${scenarioMarkup('payment', 'Reducir cuota', 'Mantienes la fecha final y pagas menos cada mes.')}
      </div>`;

    const amountInput = must(
      container.querySelector<HTMLInputElement>('[data-amortization-amount]'),
    );
    const yearInput = must(container.querySelector<HTMLSelectElement>('[data-amortization-year]'));
    const amountError = must(
      container.querySelector<HTMLElement>('[data-amortization-amount-error]'),
    );
    const globalError = must(container.querySelector<HTMLElement>('[data-global-error]'));
    const dateSummary = must(
      container.querySelector<HTMLElement>('[data-amortization-date-summary]'),
    );
    const results = must(container.querySelector<HTMLElement>('[data-amortization-results]'));

    function setValue(name: string, value: string): void {
      must(
        container.querySelector<HTMLElement>(`[data-amortization-value="${name}"]`),
      ).textContent = value;
    }

    function updateResults(): void {
      const amount = parseLocalizedNumber(amountInput.value);
      const year = Number(yearInput.value);
      rememberedSettings = { amount, year };

      const errors = validate(state);
      if (Object.keys(errors).length > 0) {
        globalError.textContent = 'Corrige los datos de la hipoteca para ver la comparación.';
        amountError.textContent = '';
        results.hidden = true;
        return;
      }

      const schedule = buildSchedule(state.principal, state.rate, state.years);
      const elapsedMonths = year * 12;
      const balance = elapsedMonths === 0 ? state.principal : schedule[elapsedMonths - 1].balance;
      const timing = year === 0 ? 'hoy' : `dentro de ${year} ${year === 1 ? 'año' : 'años'}`;
      dateSummary.textContent = `Al amortizar ${timing}, el saldo pendiente estimado será ${eur.format(balance)}.`;
      amountError.textContent =
        amount > 0 && amount <= balance
          ? ''
          : `Introduce un importe mayor que 0 y no superior al saldo de ${eur.format(balance)} en esa fecha.`;
      globalError.textContent = '';

      if (amountError.textContent) {
        results.hidden = true;
        return;
      }

      const comparison = compareAmortizationAtYear({
        principal: state.principal,
        annualRatePct: state.rate,
        years: state.years,
        amount,
        year,
      });
      dateSummary.textContent +=
        ` Tras aportar ${eur.format(amount)}, quedarían ` +
        `${eur.format(comparison.balanceAtAmortization - amount)} de principal.`;
      results.hidden = false;

      for (const [mode, scenario, interestSaved] of [
        ['current', comparison.baseline, 0],
        ['term', comparison.term, comparison.term.interestSaved],
        ['payment', comparison.payment, comparison.payment.interestSaved],
      ] as const) {
        setValue(`${mode}-monthly-payment`, eur.format(scenario.monthlyPayment));
        setValue(`${mode}-interest-saved`, eur.format(interestSaved));
        setValue(`${mode}-total-paid`, eur.format(scenario.totalPaid));
        setValue(
          `${mode}-principal-composition`,
          `${eur.format(state.principal)} (${pct.format(scenario.principalPct)})`,
        );
        setValue(
          `${mode}-total-interest`,
          `${eur.format(scenario.totalInterest)} (${pct.format(scenario.interestPct)})`,
        );
        setValue(`${mode}-payoff-duration`, duration(scenario.monthsToPayoff));
      }
    }

    amountInput.addEventListener('focus', () => {
      const amount = parseLocalizedNumber(amountInput.value);
      amountInput.value = Number.isFinite(amount) ? numberWithoutGrouping.format(amount) : '';
    });
    amountInput.addEventListener('blur', () => {
      const amount = parseLocalizedNumber(amountInput.value);
      if (Number.isFinite(amount)) amountInput.value = numberWithGrouping.format(amount);
    });
    amountInput.addEventListener('input', updateResults);
    yearInput.addEventListener('change', updateResults);
    updateResults();
  },
};
