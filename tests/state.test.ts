import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, createStore, validate } from '../src/state';

describe('validate', () => {
  it('acepta los valores por defecto', () => {
    expect(validate(DEFAULT_STATE)).toEqual({});
  });

  it('rechaza importe no positivo o vacío (NaN)', () => {
    expect(validate({ ...DEFAULT_STATE, principal: 0 }).principal).toBeDefined();
    expect(validate({ ...DEFAULT_STATE, principal: Number.NaN }).principal).toBeDefined();
  });

  it('limita el plazo a 1..30', () => {
    expect(validate({ ...DEFAULT_STATE, years: 0 }).years).toBeDefined();
    expect(validate({ ...DEFAULT_STATE, years: 31 }).years).toBeDefined();
    expect(validate({ ...DEFAULT_STATE, years: 30 }).years).toBeUndefined();
  });

  it('limita el interés a 0..20 y rechaza vacío (NaN)', () => {
    expect(validate({ ...DEFAULT_STATE, rate: -1 }).rate).toBeDefined();
    expect(validate({ ...DEFAULT_STATE, rate: 21 }).rate).toBeDefined();
    expect(validate({ ...DEFAULT_STATE, rate: Number.NaN }).rate).toBeDefined();
  });
});

describe('store', () => {
  it('notifica a los suscriptores con el nuevo estado', () => {
    const store = createStore();
    const seen: number[] = [];
    store.subscribe((s) => seen.push(s.principal));
    store.set({ principal: 200000 });
    expect(seen).toEqual([200000]);
    expect(store.get().principal).toBe(200000);
  });

  it('permite desuscribirse', () => {
    const store = createStore();
    const seen: number[] = [];
    const off = store.subscribe((s) => seen.push(s.principal));
    off();
    store.set({ principal: 123 });
    expect(seen).toEqual([]);
  });
});
