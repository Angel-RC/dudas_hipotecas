import type { State, StateKey, Store } from '../state';
import { validate } from '../state';

type Field = { key: StateKey; label: string; min: number; max?: number; step: number };

const FIELDS: Field[] = [
  { key: 'principal', label: 'Importe a financiar (€)', min: 1, step: 1000 },
  { key: 'years', label: 'Plazo (años)', min: 1, max: 30, step: 1 },
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
    <div class="grid gap-4 sm:grid-cols-3">
      ${FIELDS.map(
        (f) => `
        <label class="flex flex-col gap-1 text-sm font-semibold">${f.label}
          <input data-key="${f.key}" type="number" min="${f.min}"${
            f.max !== undefined ? ` max="${f.max}"` : ''
          } step="${f.step}" value="${state[f.key]}"
            class="rounded-lg border border-line px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-accent">
          <span data-error="${f.key}" class="min-h-[1em] text-xs text-danger"></span>
        </label>`,
      ).join('')}
    </div>`;

  const inputs = container.querySelectorAll<HTMLInputElement>('input[data-key]');
  for (const input of inputs) {
    input.addEventListener('input', () => {
      const key = input.dataset.key as StateKey;
      const raw = input.value.trim();
      store.set({ [key]: raw === '' ? Number.NaN : Number(raw) } as Partial<State>);
    });
  }

  updateErrors(container, store);
  store.subscribe(() => updateErrors(container, store));
}
