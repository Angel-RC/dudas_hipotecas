import { describe, expect, it } from 'vitest';
import { questions } from '../src/questions';
import { createStore } from '../src/state';

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Elemento no encontrado');
  return value;
}

describe('pregunta: cuota mensual y coste total', () => {
  it('muestra los valores del escenario por defecto', () => {
    const store = createStore();
    const container = document.createElement('div');
    const question = must(questions.find((q) => q.id === 'cuota'));
    question.render(container, { store });
    expect(container.textContent).toContain('632,41');
    expect(container.textContent).toContain('77.666,18');
    expect(container.textContent).toContain('34,1\u00a0%');
    expect(container.textContent).not.toMatch(/gastos/i);
    expect(container.textContent).not.toContain('%%');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(30);
    const headers = [...container.querySelectorAll('thead th')].map((header) => header.textContent);
    expect(headers).not.toContain('Gastos anual');
    expect(headers).toContain('Intereses acum.');
  });

  it('pide corregir los datos si son inválidos', () => {
    const store = createStore();
    store.set({ years: Number.NaN });
    const container = document.createElement('div');
    const question = must(questions.find((q) => q.id === 'cuota'));
    question.render(container, { store });
    expect(container.textContent).toContain('Corrige');
  });

  it('combina la cuota y los gastos en una columna anual', () => {
    const store = createStore();
    store.set({ fixedExpensesMonthly: 100 });
    const container = document.createElement('div');
    const question = must(questions.find((q) => q.id === 'cuota'));

    question.render(container, { store });

    const cards = [...container.querySelectorAll('.grid > div')];
    const card = (label: string) =>
      cards
        .find((item) => item.querySelector('span')?.textContent === label)
        ?.querySelectorAll('span')[1]?.textContent;
    expect(cards.map((item) => item.querySelector('span')?.textContent)).toEqual([
      'Cuota mensual + gastos',
      'Total pagado',
      'Intereses + gastos fijos',
      '% intereses + gastos',
    ]);
    expect(card('Cuota mensual + gastos')).toBe('732,41 €');
    expect(card('Intereses + gastos fijos')).toBe('113.666,18 €');
    expect(card('Intereses totales')).toBeUndefined();
    expect(card('Total pagado')).toBe('263.666,18 €');
    expect(card('% intereses + gastos')).toBe('43,1 %');

    const headers = [...container.querySelectorAll('thead th')].map((header) => header.textContent);
    expect(headers).toContain('Cuota anual + gastos');
    expect(headers).not.toContain('Cuota anual');
    expect(headers).not.toContain('Gastos anual');
    expect(headers).toContain('Intereses + gastos acum.');
    expect(container.querySelector('tbody tr td:nth-child(2)')?.textContent).toBe('8.788,87 €');
    expect(container.querySelector('tbody tr td:nth-child(3)')?.textContent).toBe('4.457,17 €');
    expect(container.querySelector('tbody tr td:nth-child(6)')?.textContent).toBe('5.657,17 €');
  });
});
