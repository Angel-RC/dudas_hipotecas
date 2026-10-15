import { MAX_TERM_YEARS } from './calc/mortgage';

export type State = {
  principal: number;
  years: number;
  rate: number;
  fixedExpensesMonthly: number;
};

export type StateKey = keyof State;
export type Errors = Partial<Record<StateKey, string>>;

export const DEFAULT_STATE: State = {
  principal: 150000,
  years: 30,
  rate: 3,
  fixedExpensesMonthly: 0,
};

export function validate(state: State): Errors {
  const errors: Errors = {};
  if (!(state.principal > 0)) errors.principal = 'Introduce un importe mayor que 0.';
  if (!(state.years >= 1 && state.years <= MAX_TERM_YEARS)) {
    errors.years = `El plazo debe estar entre 1 y ${MAX_TERM_YEARS} años.`;
  }
  if (!(state.rate >= 0 && state.rate <= 20)) errors.rate = 'El interés debe estar entre 0 y 20.';
  if (!(state.fixedExpensesMonthly >= 0)) {
    errors.fixedExpensesMonthly = 'Los gastos fijos no pueden ser negativos.';
  }
  return errors;
}

export type Store = {
  get: () => State;
  set: (patch: Partial<State>) => void;
  subscribe: (listener: (state: State) => void) => () => void;
};

export function createStore(initial: State = { ...DEFAULT_STATE }): Store {
  let state: State = { ...initial };
  const listeners = new Set<(state: State) => void>();
  return {
    get: () => ({ ...state }),
    set(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) listener({ ...state });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
