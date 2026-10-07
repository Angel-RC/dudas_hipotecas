import { MAX_TERM_YEARS } from '../calc/mortgage';
import { numberWithGrouping, numberWithoutGrouping, parseLocalizedNumber } from '../format';
import type { State, StateKey, Store } from '../state';
import { validate } from '../state';

type Field = {
  key: StateKey;
  label: string;
  min: number;
  max?: number;
  step: number;
  grouped?: boolean;
};

const FIELDS: Field[] = [
  { key: 'principal', label: 'Importe a financiar (€)', min: 1, step: 1000, grouped: true },
  { key: 'years', label: 'Plazo (años)', min: 1, max: MAX_TERM_YEARS, step: 1 },
  { key: 'rate', label: 'Interés anual TIN (%)', min: 0, max: 20, step: 0.05 },
];

function updateErrors(container: HTMLElement, store: Store): void {
  const errors = validate(store.get());
  const errorSpans = container.querySelectorAll<HTMLElement>('[data-error]');
  for (const el of errorSpans) {
    const key = el.dataset.error as StateKey;
    el.textContent = errors[key] ?? '';
  }
  const inputs = container.querySelectorAll<HTMLInputElement>('input[data-key]');
  for (const input of inputs) {
    const key = input.dataset.key as StateKey;
    input.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
  }
}

export function renderCommonInputs(container: HTMLElement, store: Store): void {
  const state = store.get();
  container.innerHTML = `
    <h2 class="mb-4 text-xl font-semibold">Información de mi hipoteca</h2>
    <div class="grid gap-4 sm:grid-cols-3">
      ${FIELDS.map((field) => {
        const type = field.grouped ? 'text' : 'number';
        const value = field.grouped
          ? Number.isFinite(state[field.key])
            ? numberWithGrouping.format(state[field.key])
            : ''
          : String(state[field.key]);
        const constraints = field.grouped
          ? 'inputmode="decimal" data-grouped-number autocomplete="off"'
          : `min="${field.min}"${
              field.max !== undefined ? ` max="${field.max}"` : ''
            } step="${field.step}"`;
        return `
        <label class="flex flex-col gap-1 text-sm font-medium">${field.label}
          <input data-key="${field.key}" type="${type}" ${constraints} value="${value}"
            class="rounded-xl border border-line bg-white px-4 py-3 text-right tabular-nums font-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
          <span data-error="${field.key}" class="min-h-[1em] text-xs text-danger"></span>
        </label>`;
      }).join('')}
    </div>`;

  const inputs = container.querySelectorAll<HTMLInputElement>('input[data-key]');
  for (const input of inputs) {
    const key = input.dataset.key as StateKey;
    if (input.dataset.groupedNumber !== undefined) {
      input.addEventListener('focus', () => {
        const value = store.get()[key];
        input.value = Number.isFinite(value) ? numberWithoutGrouping.format(value) : '';
      });
      input.addEventListener('blur', () => {
        const value = parseLocalizedNumber(input.value);
        if (Number.isFinite(value)) input.value = numberWithGrouping.format(value);
      });
    }
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      const value =
        input.dataset.groupedNumber !== undefined
          ? parseLocalizedNumber(raw)
          : raw === ''
            ? Number.NaN
            : Number(raw);
      store.set({ [key]: value } as Partial<State>);
    });
  }

  updateErrors(container, store);
  store.subscribe(() => updateErrors(container, store));
}
