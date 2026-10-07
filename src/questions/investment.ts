import { buildSchedule, compareTerms, monthlyPayment } from '../calc/mortgage';
import { eur } from '../format';
import { validate } from '../state';
import { renderChart } from '../ui/chart';
import type { Question } from './types';

type Settings = { budget: number; netReturnPct: number };

let rememberedSettings: Settings | undefined;

function must<T extends HTMLElement>(value: T | null): T {
  if (!value) throw new Error('No se encontró un control de inversión');
  return value;
}

export const investmentQuestion: Question = {
  id: 'invertir',
  title: '¿Qué plazo me conviene si invierto lo que sobra?',
  summary: 'Compara la cuota de cada plazo y la inversión del presupuesto mensual restante.',
  render(container, { store }) {
    const state = store.get();
    rememberedSettings ??= {
      budget: Math.ceil(monthlyPayment(state.principal, state.rate, state.years) * 1.2),
      netReturnPct: 5,
    };
    const settings = rememberedSettings;

    container.innerHTML = `
      <p class="mb-5 text-sm text-muted">
        Indica tu presupuesto mensual total para hipoteca e inversión y la rentabilidad neta anual
        que esperas. Cada escenario destina primero el presupuesto a la cuota; invierte el resto
        mientras haya hipoteca y, al terminar de pagarla, invierte el presupuesto completo.
        Comparamos el patrimonio neto al final del plazo indicado arriba.
      </p>
      <div class="mb-5 grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm font-semibold">Presupuesto mensual total (hipoteca + inversión, €)
          <input data-investment-budget type="number" min="1" step="50" value="${settings.budget}"
            class="rounded-lg border border-line px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-accent">
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold">Rentabilidad neta anual esperada (%)
          <input data-investment-return type="number" min="0" max="30" step="0.25" value="${settings.netReturnPct}"
            class="rounded-lg border border-line px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-accent">
        </label>
      </div>
      <p data-investment-error class="mb-4 text-sm text-danger"></p>
      <section data-investment-results hidden>
        <h3 class="mb-1 text-lg font-semibold">Mayor patrimonio neto estimado</h3>
        <p class="mb-5 text-sm text-muted">
          La diferencia mensual entre el presupuesto y la cuota se invierte durante la hipoteca.
          El patrimonio neto resta la deuda que todavía quede al llegar al horizonte.
        </p>
        <dl class="mb-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt class="text-sm text-muted">Plazo recomendado</dt>
            <dd data-best-term class="text-2xl font-bold"></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Cuota hipotecaria mensual</dt>
            <dd data-best-monthly-payment class="text-xl font-semibold"></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Inversión mensual mientras pagas la hipoteca</dt>
            <dd data-best-monthly-investment class="text-xl font-semibold"></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Inversión acumulada al final del horizonte</dt>
            <dd data-best-invested class="text-xl font-semibold"></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Deuda pendiente al final del horizonte</dt>
            <dd data-best-outstanding-debt class="text-xl font-semibold"></dd>
          </div>
          <div>
            <dt class="text-sm text-muted">Patrimonio neto (inversión menos deuda)</dt>
            <dd data-best-net-wealth class="text-xl font-bold text-accent"></dd>
          </div>
        </dl>
        <p data-current-term-summary class="mb-5 text-sm text-muted"></p>
        <div data-investment-chart class="h-96 p-1 sm:p-2"></div>
      </section>`;

    const budgetInput = must(container.querySelector<HTMLInputElement>('[data-investment-budget]'));
    const returnInput = must(container.querySelector<HTMLInputElement>('[data-investment-return]'));
    const error = must(container.querySelector<HTMLElement>('[data-investment-error]'));
    const resultsContainer = must(
      container.querySelector<HTMLElement>('[data-investment-results]'),
    );
    const chartContainer = must(container.querySelector<HTMLElement>('[data-investment-chart]'));

    function setText(selector: string, value: string): void {
      must(container.querySelector<HTMLElement>(selector)).textContent = value;
    }

    function updateResults(): void {
      const budget = Number(budgetInput.value);
      const netReturnPct = Number(returnInput.value);
      rememberedSettings = { budget, netReturnPct };

      if (Object.keys(validate(state)).length > 0) {
        error.textContent = 'Corrige los datos de la hipoteca para ver la comparación.';
        resultsContainer.hidden = true;
        return;
      }
      if (
        !(budget > 0) ||
        !Number.isFinite(budget) ||
        returnInput.value.trim() === '' ||
        !Number.isFinite(netReturnPct) ||
        netReturnPct < 0 ||
        netReturnPct > 30
      ) {
        error.textContent =
          'Introduce un presupuesto mayor que 0 y una rentabilidad neta entre 0% y 30%.';
        resultsContainer.hidden = true;
        return;
      }

      const comparison = compareTerms(
        state.principal,
        state.rate,
        budget,
        netReturnPct,
        state.years,
      );
      const best = comparison.best;
      if (!best) {
        error.textContent = 'El presupuesto no alcanza para cubrir la cuota de ningún plazo.';
        resultsContainer.hidden = true;
        return;
      }

      error.textContent = '';
      resultsContainer.hidden = false;
      const horizonMonths = Math.round(state.years * 12);
      const bestSchedule = buildSchedule(state.principal, state.rate, best.years);
      const outstandingDebt = bestSchedule[horizonMonths - 1]?.balance ?? 0;
      const currentTerm = comparison.terms.find((term) => term.years === Math.round(state.years));

      setText('[data-best-term]', `${best.years} ${best.years === 1 ? 'año' : 'años'}`);
      setText('[data-best-monthly-payment]', eur.format(best.monthlyPayment));
      setText(
        '[data-best-monthly-investment]',
        eur.format(Math.max(budget - best.monthlyPayment, 0)),
      );
      setText('[data-best-invested]', eur.format(best.invested));
      setText('[data-best-outstanding-debt]', eur.format(outstandingDebt));
      setText('[data-best-net-wealth]', eur.format(best.netWealth));
      setText(
        '[data-current-term-summary]',
        currentTerm?.affordable
          ? `Con el plazo actual de ${currentTerm.years} años, el patrimonio neto estimado sería ${eur.format(currentTerm.netWealth)}.`
          : 'El plazo actual no cabe en el presupuesto mensual indicado.',
      );

      renderChart(chartContainer, {
        type: 'line',
        data: {
          labels: comparison.terms.map(
            (term) => `${term.years} ${term.years === 1 ? 'año' : 'años'}`,
          ),
          datasets: [
            {
              label: 'Patrimonio neto al final del horizonte',
              data: comparison.terms.map((term) => (term.affordable ? term.netWealth : Number.NaN)),
              borderColor: '#2f6df6',
              backgroundColor: '#2f6df6',
              pointRadius: comparison.terms.map((term) => (term.years === best.years ? 6 : 3)),
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (item) => `Patrimonio neto: ${eur.format(Number(item.raw))}`,
              },
            },
          },
          scales: {
            x: { title: { display: true, text: 'Plazo de la hipoteca' } },
            y: {
              title: { display: true, text: 'Patrimonio neto al horizonte (€)' },
              ticks: { callback: (value) => eur.format(Number(value)) },
            },
          },
        },
      });
    }

    budgetInput.addEventListener('input', updateResults);
    returnInput.addEventListener('input', updateResults);
    updateResults();
  },
};
