import { describe, expect, it } from 'vitest';
import { createStore } from '../src/state';
import { renderCards } from '../src/ui/cards';
import { renderCommonInputs } from '../src/ui/inputs';
import { renderTable } from '../src/ui/table';

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Elemento no encontrado');
  return value;
}

describe('cards', () => {
  it('renderiza etiquetas y valores', () => {
    const el = document.createElement('div');
    renderCards(el, [{ label: 'Cuota', value: '632,41 €' }]);
    expect(el.textContent).toContain('Cuota');
    expect(el.textContent).toContain('632,41 €');
  });
});

describe('table', () => {
  it('renderiza cabeceras y filas', () => {
    const el = document.createElement('div');
    renderTable(
      el,
      ['A', 'B'],
      [
        ['1', '2'],
        ['3', '4'],
      ],
    );
    expect(el.querySelectorAll('thead th')).toHaveLength(2);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
  });
});

describe('inputs comunes', () => {
  it('renderiza los tres campos y actualiza el store', () => {
    const el = document.createElement('div');
    const store = createStore();
    renderCommonInputs(el, store);
    const input = must(el.querySelector<HTMLInputElement>('input[data-key="principal"]'));
    expect(input).toBeTruthy();
    input.value = '200000';
    input.dispatchEvent(new Event('input'));
    expect(store.get().principal).toBe(200000);
  });

  it('trata un campo vacío como inválido (NaN) y muestra el error', () => {
    const el = document.createElement('div');
    const store = createStore();
    renderCommonInputs(el, store);
    const input = must(el.querySelector<HTMLInputElement>('input[data-key="rate"]'));
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(Number.isNaN(store.get().rate)).toBe(true);
    expect(must(el.querySelector('[data-error="rate"]')).textContent).not.toBe('');
  });
});
