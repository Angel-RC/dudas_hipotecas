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
    expect(container.textContent).not.toContain('%%');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(30);
  });

  it('pide corregir los datos si son inválidos', () => {
    const store = createStore();
    store.set({ years: Number.NaN });
    const container = document.createElement('div');
    const question = must(questions.find((q) => q.id === 'cuota'));
    question.render(container, { store });
    expect(container.textContent).toContain('Corrige');
  });
});
