import {
  type FeeUnit,
  type SwitchOption,
  compareMortgageSwitch,
  pendingBalance,
  switchFeeAmount,
} from '../calc/mortgage';
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
  fee: '#2D373D',
  expenses: '#D6A33A',
};

type Settings = { remainingMonths: number; newRate: number; fee: number; feeUnit: FeeUnit };
type Field = 'remainingMonths' | 'newRate' | 'fee';
type Mode = 'current' | 'switched';

let rememberedSettings: Settings | undefined;

function must<T extends HTMLElement>(value: T | null): T {
  if (!value) throw new Error('No se encontró un control del cambio de hipoteca');
  return value;
}

function share(value: number, total: number): string {
  return `${eur.format(value)} (${pct.format(total > 0 ? (value / total) * 100 : 0)})`;
}

function formatFee(value: number, unit: FeeUnit): string {
  if (!Number.isFinite(value)) return '';
  return unit === 'eur' ? numberWithGrouping.format(value) : numberWithoutGrouping.format(value);
}

const INPUT_CLASS =
  'rounded-xl border border-line bg-white px-4 py-3 text-right tabular-nums font-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

function scenarioMarkup(mode: Mode, title: string, description: string): string {
  return `
    <article data-switch-scenario="${mode}" class="min-w-0 py-1">
      <h3 class="mb-1 text-lg font-semibold">${title}</h3>
      <p class="mb-4 text-sm text-muted">${description}</p>
      <dl class="space-y-3">
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">Coste total hasta terminar de pagar</dt>
          <dd data-switch-value="${mode}-total-paid" class="text-xl font-semibold"></dd>
        </div>
        <div class="rounded-3xl bg-panel p-5 shadow-sm">
          <dt class="text-sm text-muted">Cuota mensual de la hipoteca</dt>
          <dd data-switch-value="${mode}-monthly-payment" class="text-xl font-semibold"></dd>
        </div>
        <div class="border-t border-line pt-3">
          <div class="flex justify-between gap-3 text-sm">
            <dt>Capital pendiente</dt>
            <dd data-switch-value="${mode}-principal" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Intereses</dt>
            <dd data-switch-value="${mode}-interest" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Comisión del cambio</dt>
            <dd data-switch-value="${mode}-fee" class="text-right font-medium"></dd>
          </div>
          <div class="mt-2 flex justify-between gap-3 text-sm">
            <dt>Gastos fijos</dt>
            <dd data-switch-value="${mode}-expenses" class="text-right font-medium"></dd>
          </div>
        </div>
      </dl>
    </article>`;
}

export function switchVerdict(totalSaving: number): string {
  if (Math.abs(totalSaving) < 0.005) return 'Cambiar o seguir te cuesta lo mismo.';
  if (totalSaving > 0) return `Te compensa cambiar: ahorras ${eur.format(totalSaving)} en total.`;
  return `No te compensa cambiar: pagas ${eur.format(-totalSaving)} más en total.`;
}

function breakEvenText(months: number | null, monthlySaving: number): string {
  if (monthlySaving <= 0.005)
    return 'La cuota nueva no es más baja, así que la comisión no se recupera mes a mes.';
  if (months === null) {
    return `La cuota baja ${eur.format(monthlySaving)} al mes, pero no da tiempo a recuperar la comisión antes de terminar.`;
  }
  if (months === 0)
    return `La cuota baja ${eur.format(monthlySaving)} al mes y no hay comisión que recuperar.`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const span =
    years > 0
      ? ` (${years} ${years === 1 ? 'año' : 'años'}${rest ? ` y ${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''})`
      : '';
  return `La cuota baja ${eur.format(monthlySaving)} al mes: recuperas la comisión en ${months} ${months === 1 ? 'mes' : 'meses'}${span}.`;
}

export const switchMortgageQuestion: Question = {
  id: 'cambio-hipoteca',
  title: '¿Me compensa cambiar de hipoteca?',
  summary:
    'Compara lo que te cuesta seguir con tu hipoteca frente a cambiarte a otra pagando la comisión.',
  render(container, { store }) {
    const state = store.get();
    rememberedSettings ??= {
      remainingMonths: Math.round(state.years * 12),
      newRate: Math.max(Math.round((state.rate - 0.5) * 100) / 100, 0),
      fee: 0,
      feeUnit: 'eur',
    };
    const settings = rememberedSettings;
    const hasFixedExpenses = state.fixedExpensesMonthly > 0;

    container.innerHTML = `
      <p class="mb-4 text-sm text-muted">
        Los datos de la hipoteca son los de tu hipoteca actual tal como la firmaste. Indica las
        mensualidades que te quedan por pagar y calculamos el capital pendiente. La hipoteca nueva financia ese
        capital durante las mismas mensualidades. Indica su interés y lo que te cuesta el cambio.${
          hasFixedExpenses ? ' Los gastos fijos se suman a las dos opciones.' : ''
        }
      </p>
      <div class="mb-5 grid gap-4 sm:grid-cols-3">
        <label class="flex flex-col gap-1 text-sm font-semibold">Mensualidades que me quedan
          <input data-switch-input="remainingMonths" type="number" min="1" max="${Math.round(state.years * 12)}" step="1"
            value="${Number.isFinite(settings.remainingMonths) ? settings.remainingMonths : ''}" class="${INPUT_CLASS}">
          <span data-switch-error="remainingMonths" class="min-h-[1em] text-xs text-danger"></span>
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">Interés de la hipoteca nueva TIN (%)
          <input data-switch-input="newRate" type="number" min="0" max="20" step="0.05"
            value="${Number.isFinite(settings.newRate) ? settings.newRate : ''}" class="${INPUT_CLASS}">
          <span data-switch-error="newRate" class="min-h-[1em] text-xs text-danger"></span>
        </label>
        <div class="flex flex-col gap-1 text-sm font-semibold">
          <label for="switch-fee">Comisión del cambio</label>
          <div class="flex gap-2">
            <input id="switch-fee" data-switch-input="fee" type="text" inputmode="decimal" autocomplete="off"
              value="${formatFee(settings.fee, settings.feeUnit)}" class="${INPUT_CLASS} min-w-0 flex-1">
            <select data-switch-input="feeUnit" aria-label="Unidad de la comisión"
              class="rounded-xl border border-line bg-white px-3 py-3 font-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
              <option value="eur"${settings.feeUnit === 'eur' ? ' selected' : ''}>€</option>
              <option value="pct"${settings.feeUnit === 'pct' ? ' selected' : ''}>% del capital</option>
            </select>
          </div>
          <span data-switch-error="fee" class="min-h-[1em] text-xs text-danger"></span>
        </div>
      </div>
      <p data-global-error class="mb-4 text-sm text-danger"></p>
      <div data-switch-results>
        <p data-switch-pending class="mb-3 text-sm text-muted"></p>
        <p data-switch-verdict class="mb-2 text-lg font-semibold"></p>
        <p data-switch-break-even class="mb-5 text-sm text-muted"></p>
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          ${scenarioMarkup('current', 'Seguir con mi hipoteca', 'Tu interés actual, sin comisión.')}
          <div aria-hidden="true" class="border-t border-line lg:border-t-0 lg:border-l"></div>
          ${scenarioMarkup('switched', 'Cambiar de hipoteca', 'El interés nuevo más la comisión del cambio.')}
        </div>
        <div data-switch-chart class="mt-6 h-80 rounded-3xl bg-panel p-4 shadow-sm md:p-6"></div>
      </div>`;

    const remainingInput = must(
      container.querySelector<HTMLInputElement>('[data-switch-input="remainingMonths"]'),
    );
    const pendingText = must(container.querySelector<HTMLElement>('[data-switch-pending]'));
    const newRateInput = must(
      container.querySelector<HTMLInputElement>('[data-switch-input="newRate"]'),
    );
    const feeInput = must(container.querySelector<HTMLInputElement>('[data-switch-input="fee"]'));
    const unitSelect = must(
      container.querySelector<HTMLSelectElement>('[data-switch-input="feeUnit"]'),
    );
    const globalError = must(container.querySelector<HTMLElement>('[data-global-error]'));
    const results = must(container.querySelector<HTMLElement>('[data-switch-results]'));
    const verdict = must(container.querySelector<HTMLElement>('[data-switch-verdict]'));
    const breakEven = must(container.querySelector<HTMLElement>('[data-switch-break-even]'));
    const chart = must(container.querySelector<HTMLElement>('[data-switch-chart]'));

    function setValue(name: string, value: string): void {
      must(container.querySelector<HTMLElement>(`[data-switch-value="${name}"]`)).textContent =
        value;
    }

    function setError(name: Field, input: HTMLElement, message: string): void {
      must(container.querySelector<HTMLElement>(`[data-switch-error="${name}"]`)).textContent =
        message;
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function showOption(mode: Mode, option: SwitchOption): void {
      setValue(`${mode}-total-paid`, eur.format(option.totalPaid));
      setValue(`${mode}-monthly-payment`, eur.format(option.monthlyPayment));
      setValue(`${mode}-principal`, share(option.principal, option.totalPaid));
      setValue(`${mode}-interest`, share(option.interest, option.totalPaid));
      setValue(`${mode}-fee`, share(option.fee, option.totalPaid));
      setValue(`${mode}-expenses`, share(option.expenses, option.totalPaid));
    }

    function updateResults(): void {
      const raw = newRateInput.value.trim();
      const rawRemaining = remainingInput.value.trim();
      const next: Settings = {
        remainingMonths: rawRemaining === '' ? Number.NaN : Number(rawRemaining),
        newRate: raw === '' ? Number.NaN : Number(raw),
        fee: parseLocalizedNumber(feeInput.value),
        feeUnit: unitSelect.value === 'pct' ? 'pct' : 'eur',
      };
      rememberedSettings = next;

      const rateError =
        next.newRate >= 0 && next.newRate <= 20 ? '' : 'El interés debe estar entre 0 y 20.';
      let feeError = '';
      if (!(next.fee >= 0)) feeError = 'La comisión no puede ser negativa.';
      else if (next.feeUnit === 'pct' && next.fee > 100) {
        feeError = 'El porcentaje no puede superar el 100 %.';
      }
      const remainingError =
        Number.isInteger(next.remainingMonths) &&
        next.remainingMonths >= 1 &&
        next.remainingMonths <= Math.round(state.years * 12)
          ? ''
          : `Debe ser un número entero entre 1 y ${Math.round(state.years * 12)} (las mensualidades de tu hipoteca).`;
      setError('remainingMonths', remainingInput, remainingError);
      setError('newRate', newRateInput, rateError);
      setError('fee', feeInput, feeError);

      if (Object.keys(validate(state)).length > 0) {
        globalError.textContent = 'Corrige los datos de la hipoteca para ver la comparación.';
        results.hidden = true;
        return;
      }
      globalError.textContent = '';
      if (remainingError || rateError || feeError) {
        results.hidden = true;
        return;
      }

      const pending = pendingBalance(
        state.principal,
        state.rate,
        state.years,
        next.remainingMonths,
      );
      const comparison = compareMortgageSwitch({
        principal: pending,
        years: next.remainingMonths / 12,
        currentRatePct: state.rate,
        newRatePct: next.newRate,
        fixedExpensesMonthly: state.fixedExpensesMonthly,
        fee: switchFeeAmount(pending, next.fee, next.feeUnit),
      });
      results.hidden = false;
      pendingText.textContent = `Capital pendiente hoy: ${eur.format(pending)}.`;
      verdict.textContent = switchVerdict(comparison.totalSaving);
      breakEven.textContent = breakEvenText(comparison.breakEvenMonths, comparison.monthlySaving);
      showOption('current', comparison.current);
      showOption('switched', comparison.switched);

      const options = [comparison.current, comparison.switched];
      renderChart(chart, {
        type: 'bar',
        data: {
          labels: ['Seguir con mi hipoteca', 'Cambiar de hipoteca'],
          datasets: [
            {
              label: 'Capital',
              data: options.map((option) => option.principal),
              backgroundColor: COLORS.principal,
            },
            {
              label: 'Intereses',
              data: options.map((option) => option.interest),
              backgroundColor: COLORS.interest,
            },
            {
              label: 'Comisión',
              data: options.map((option) => option.fee),
              backgroundColor: COLORS.fee,
            },
            {
              label: 'Gastos fijos',
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
              title: { display: true, text: 'Coste total (€)', color: '#2D373D' },
              ticks: { color: '#526570' },
              grid: { color: '#DDE3E6' },
            },
            y: { stacked: true, ticks: { color: '#526570' }, grid: { display: false } },
          },
        },
      });
    }

    feeInput.addEventListener('focus', () => {
      const value = parseLocalizedNumber(feeInput.value);
      feeInput.value = Number.isFinite(value) ? numberWithoutGrouping.format(value) : '';
    });
    feeInput.addEventListener('blur', () => {
      const value = parseLocalizedNumber(feeInput.value);
      if (Number.isFinite(value)) feeInput.value = formatFee(value, unitSelect.value as FeeUnit);
    });
    remainingInput.addEventListener('input', updateResults);
    newRateInput.addEventListener('input', updateResults);
    feeInput.addEventListener('input', updateResults);
    unitSelect.addEventListener('change', updateResults);
    updateResults();
  },
};
