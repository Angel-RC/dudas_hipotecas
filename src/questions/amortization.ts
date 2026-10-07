import { buildSchedule, compareAmortizationAtYear } from '../calc/mortgage';
import { eur, pct } from '../format';
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

function scenarioMarkup(mode: 'term' | 'payment', title: string, description: string): string {
  return `
    <article data-amortization-scenario="${mode}" class="min-w-0 py-1">
      <h3 class="mb-1 text-lg font-semibold">${title}</h3>
      <p class="mb-4 text-sm text-muted">${description}</p>
      <dl class="space-y-3">
        <div class="rounded-lg bg-panel p-3">
          <dt class="text-sm text-muted">Cuota fija mensual tras amortizar</dt>
          <dd data-amortization-value="${mode}-monthly-payment" class="text-xl font-semibold"></dd>
        </div>
        <div class="rounded-lg bg-panel p-3">
          <dt class="text-sm text-muted">Intereses ahorrados</dt>
          <dd data-amortization-value="${mode}-interest-saved" class="text-xl font-semibold text-accent"></dd>
        </div>
        <div class="rounded-lg bg-panel p-3">
          <dt class="text-sm text-muted">Total que pagarás, incluida la amortización</dt>
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
        Indica cuánto quieres amortizar y cuándo. Comparamos los dos escenarios desde hoy,
        contando las cuotas previas a la amortización y el importe extra como devolución de principal.
        Los porcentajes muestran qué parte del total pagado corresponde a principal e intereses.
      </p>
      <div class="mb-5 grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm font-semibold">Importe de la amortización (€)
          <input data-amortization-amount type="number" min="0.01" max="${state.principal}" step="100"
            value="${settings.amount}"
            class="rounded-lg border border-line px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-accent">
          <span data-amortization-amount-error class="min-h-[1em] text-xs text-danger"></span>
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">¿Cuándo amortizas?
          <select data-amortization-year
            class="rounded-lg border border-line bg-panel px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-accent">
            ${yearOptions}
          </select>
        </label>
      </div>
      <p data-amortization-date-summary class="mb-4 text-sm text-muted"></p>
      <p data-global-error class="mb-4 text-sm text-danger"></p>
      <p data-amortization-baseline class="mb-5 rounded-lg border border-line p-3 text-sm text-muted"></p>
      <div data-amortization-results class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
        ${scenarioMarkup('term', 'Reducir plazo', 'Mantienes la cuota actual y terminas antes.')}
        <div data-amortization-divider aria-hidden="true" class="border-t border-line sm:border-t-0 sm:border-l"></div>
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
    const baseline = must(container.querySelector<HTMLElement>('[data-amortization-baseline]'));
    const results = must(container.querySelector<HTMLElement>('[data-amortization-results]'));

    function setValue(name: string, value: string): void {
      must(
        container.querySelector<HTMLElement>(`[data-amortization-value="${name}"]`),
      ).textContent = value;
    }

    function updateResults(): void {
      const amount = Number(amountInput.value);
      const year = Number(yearInput.value);
      rememberedSettings = { amount, year };

      const errors = validate(state);
      if (Object.keys(errors).length > 0) {
        globalError.textContent = 'Corrige los datos de la hipoteca para ver la comparación.';
        amountError.textContent = '';
        results.hidden = true;
        baseline.hidden = true;
        return;
      }

      const schedule = buildSchedule(state.principal, state.rate, state.years);
      const elapsedMonths = year * 12;
      const balance = elapsedMonths === 0 ? state.principal : schedule[elapsedMonths - 1].balance;
      amountInput.max = String(balance);
      const timing = year === 0 ? 'hoy' : `dentro de ${year} ${year === 1 ? 'año' : 'años'}`;
      dateSummary.textContent = `Al amortizar ${timing}, el saldo pendiente estimado será ${eur.format(balance)}.`;
      amountError.textContent =
        amount > 0 && amount <= balance
          ? ''
          : `Introduce un importe mayor que 0 y no superior al saldo de ${eur.format(balance)} en esa fecha.`;
      globalError.textContent = '';

      if (amountError.textContent) {
        results.hidden = true;
        baseline.hidden = true;
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
      baseline.hidden = false;
      baseline.textContent =
        `Sin amortizar: cuota de ${eur.format(comparison.baseline.monthlyPayment)}, ` +
        `${eur.format(comparison.baseline.totalInterest)} de intereses y ` +
        `${eur.format(comparison.baseline.totalPaid)} en total.`;

      for (const [mode, scenario] of [
        ['term', comparison.term],
        ['payment', comparison.payment],
      ] as const) {
        setValue(`${mode}-monthly-payment`, eur.format(scenario.monthlyPayment));
        setValue(`${mode}-interest-saved`, eur.format(scenario.interestSaved));
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

    amountInput.addEventListener('input', updateResults);
    yearInput.addEventListener('change', updateResults);
    updateResults();
  },
};
