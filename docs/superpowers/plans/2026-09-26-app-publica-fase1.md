# App pública de hipotecas — Fase 1: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescritura del simulador como SPA estática (Vite + TypeScript + Tailwind) con layout de dos columnas, motor de cálculo portado con tests y la primera pregunta funcionando.

**Architecture:** SPA vanilla TS sin framework. Un store central con datos comunes, un registro de preguntas (módulos) y un router por hash. La app actual se conserva en `legacy/` como referencia. Esta fase entrega una app construible y desplegable con una pregunta.

**Tech Stack:** Vite 5, TypeScript 5.6 (estricto), Tailwind CSS 3.4 (+ PostCSS/autoprefixer), Vitest 2 (jsdom), Biome 1.9. Chart.js se añade en la Fase 2.

**Spec:** `docs/superpowers/specs/2026-09-26-app-publica-hipotecas-design.md`

## Global Constraints

- Node 20+ y npm. Sin backend ni persistencia. Salida 100 % estática en `dist/`.
- TypeScript estricto (`strict`, `noUnusedLocals`, `noUnusedParameters`). Sin comentarios en el código salvo indicación explícita.
- UI en español. Moneda EUR. Formato es-ES (miles `.`, decimales `,`). Ojo: `Intl` usa espacio duro (U+00A0/U+202F) antes del `€`.
- `MAX_TERM_YEARS = 30` es el plazo máximo.
- Sin framework de UI. Cada pregunta es un módulo del registro; añadir una pregunta = añadir un módulo.
- Los tests del motor deben conservar los valores de referencia del `legacy/verify.mjs` actual: cuota 150k/30a/3% ≈ 632,41 €; intereses ≈ 77.666,18 €; capital final 0; comparador 30 plazos; óptimo 30 años con 5 % neto y 1.000 €/mes; rentabilidad de indiferencia 20 vs 30 años ≈ 3,0416 %.

## Estructura de archivos (Fase 1)

```
index.html                 # entrada de Vite (nuevo; el actual pasa a legacy/)
package.json, vite.config.ts, tsconfig.json
tailwind.config.js, postcss.config.js, biome.json, .gitignore
src/
  main.ts                  # arranque: store + layout + router + render
  router.ts                # enrutado por hash
  state.ts                 # store + validación de datos comunes
  format.ts                # eur / pct (es-ES)
  style.css                # directivas Tailwind
  calc/mortgage.ts         # motor puro portado
  ui/layout.ts             # shell de dos columnas
  ui/sidebar.ts            # índice de preguntas
  ui/inputs.ts             # panel de datos comunes
  ui/cards.ts              # tarjetas de resumen
  ui/table.ts              # tabla genérica
  questions/types.ts       # tipos del registro
  questions/index.ts       # registro
  questions/monthlyPayment.ts
tests/
  format.test.ts, mortgage.test.ts, state.test.ts, layout.test.ts, ui.test.ts, monthlyPayment.test.ts
legacy/
  index.html, verify.mjs
```

---

### Task 1: Scaffold del proyecto, tooling y formato

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `biome.json`, `.gitignore`, `index.html`, `src/main.ts`, `src/style.css`, `src/format.ts`, `tests/format.test.ts`
- Move: `index.html` → `legacy/index.html`, `verify.mjs` → `legacy/verify.mjs`

**Interfaces:**
- Produces: `eur: Intl.NumberFormat`, `pct: Intl.NumberFormat` desde `src/format.ts`.

- [ ] **Step 1: Mover la app actual a `legacy/`**

```bash
mkdir -p legacy
git mv index.html legacy/index.html
git mv verify.mjs legacy/verify.mjs
```

- [ ] **Step 2: Crear la configuración**

`package.json`:
```json
{
  "name": "hipotecas",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "dependencies": {},
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f6f7f9',
        panel: '#ffffff',
        ink: '#1c2430',
        muted: '#6b7686',
        line: '#dde3ea',
        accent: '#2f6df6',
        interest: '#f0713a',
        balance: '#7a3df0',
        danger: '#c0392b',
      },
    },
  },
  plugins: [],
};
```

`postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "files": { "ignore": ["dist", "legacy", "node_modules"] }
}
```

`.gitignore`:
```
node_modules
dist
```

- [ ] **Step 3: Crear la entrada y el estilo**

`index.html`:
```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulador de hipotecas</title>
</head>
<body>
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/style.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/main.ts` (placeholder que se sustituye en Task 4):
```ts
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) app.textContent = 'Simulador de hipotecas';
```

- [ ] **Step 4: Escribir el test de formato (que debe fallar)**

`tests/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { eur, pct } from '../src/format';

const norm = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

describe('format', () => {
  it('formatea euros en es-ES', () => {
    expect(norm(eur.format(632.406))).toBe('632,41 €');
    expect(norm(eur.format(150000))).toBe('150.000,00 €');
  });

  it('formatea porcentajes con un decimal', () => {
    expect(norm(pct.format(34.114))).toBe('34,1 %');
  });
});
```

- [ ] **Step 5: Ejecutar el test y ver que falla**

Run: `npm install && npm test`
Expected: FAIL — no se encuentra el módulo `../src/format`.

- [ ] **Step 6: Crear `src/format.ts`**

```ts
export const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export const pct = new Intl.NumberFormat('es-ES', {
  style: 'unit',
  unit: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
```

- [ ] **Step 7: Ejecutar tests y build**

Run: `npm test`
Expected: PASS (2 tests).

Run: `npm run build`
Expected: `tsc` sin errores y `vite build` genera `dist/`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TypeScript + Tailwind + Vitest; mueve la app actual a legacy/"
```

---

### Task 2: Motor de cálculo portado con tests

**Files:**
- Create: `src/calc/mortgage.ts`, `tests/mortgage.test.ts`

**Interfaces:**
- Produces:
  - `MAX_TERM_YEARS: number` (= 30)
  - `monthlyRate(annualRatePct: number): number`
  - `monthlyPayment(principal: number, annualRatePct: number, years: number): number`
  - `buildSchedule(principal: number, annualRatePct: number, years: number): MonthRow[]`
  - `aggregateByYear(months: MonthRow[]): YearRow[]`
  - `summarize(principal: number, annualRatePct: number, years: number): Summary`
  - `monthlyNetReturn(netReturnPct: number): number`
  - `investDifference(principal, annualRatePct, years, monthlyBudget, netReturnPct, horizonYears): TermResult`
  - `compareTerms(principal, annualRatePct, monthlyBudget, netReturnPct, horizonYears, maxYears?): { terms: TermResult[]; best: TermResult | null }`
  - `breakEvenReturn(principal, annualRatePct, monthlyBudget, horizonYears, termA, termB): number | null`
  - Tipos: `MonthRow`, `YearRow`, `Summary`, `TermResult`.

- [ ] **Step 1: Escribir los tests (que deben fallar)**

`tests/mortgage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  MAX_TERM_YEARS, monthlyPayment, buildSchedule, aggregateByYear, summarize,
  monthlyNetReturn, investDifference, compareTerms, breakEvenReturn,
} from '../src/calc/mortgage';

describe('motor de cálculo', () => {
  it('expone MAX_TERM_YEARS = 30', () => {
    expect(MAX_TERM_YEARS).toBe(30);
  });

  it('calcula cuota, total e intereses del escenario de referencia', () => {
    const s = summarize(150000, 3, 30);
    expect(s.monthlyPayment).toBeCloseTo(632.41, 2);
    expect(s.totalInterest).toBeCloseTo(77666.18, 1);
    expect(s.totalPaid).toBeCloseTo(227666.18, 1);
    expect(s.interestPct).toBeCloseTo(34.114, 2);
    expect(s.months).toHaveLength(360);
  });

  it('maneja el tipo 0%', () => {
    const z = summarize(150000, 0, 30);
    expect(z.monthlyPayment).toBeCloseTo(416.6667, 4);
    expect(z.totalInterest).toBeCloseTo(0, 4);
    expect(z.interestPct).toBe(0);
  });

  it('cierra el capital en 0 y amortiza el importe completo', () => {
    const months = buildSchedule(150000, 3, 30);
    expect(months).toHaveLength(360);
    expect(months.at(-1)!.balance).toBeCloseTo(0, 6);
    expect(months.reduce((a, m) => a + m.principal, 0)).toBeCloseTo(150000, 2);
  });

  it('agrega por años', () => {
    const years = aggregateByYear(buildSchedule(150000, 3, 30));
    expect(years).toHaveLength(30);
    expect(years.at(-1)!.cumPrincipal).toBeCloseTo(150000, 2);
    expect(years.at(-1)!.cumInterest).toBeCloseTo(77666.18, 1);
  });

  it('convierte rentabilidad anual a mensual', () => {
    expect(monthlyNetReturn(0)).toBeCloseTo(0, 12);
    expect(monthlyNetReturn(5)).toBeCloseTo(0.00407412, 8);
  });

  it('compara plazos con presupuesto fijo', () => {
    const inv = investDifference(150000, 3, 30, 1000, 0, 30);
    expect(inv.invested).toBeCloseTo(132333.82, 1);
    expect(inv.netWealth).toBeCloseTo(inv.invested, 6);
    expect(inv.affordable).toBe(true);
    expect(investDifference(150000, 3, 30, 600, 0, 30).affordable).toBe(false);

    const w5 = investDifference(150000, 3, 5, 1000, 0, 30).netWealth;
    const w20 = investDifference(150000, 3, 20, 1000, 0, 30).netWealth;
    const w30 = investDifference(150000, 3, 30, 1000, 0, 30).netWealth;
    expect(w5).toBeGreaterThan(w20);
    expect(w20).toBeGreaterThan(w30);

    const cmp = compareTerms(150000, 3, 1000, 5, 30);
    expect(cmp.terms).toHaveLength(30);
    expect(cmp.best!.years).toBe(30);
    expect(cmp.best!.netWealth).toBeCloseTo(299727.25, 0);
  });

  it('calcula la rentabilidad de indiferencia', () => {
    expect(breakEvenReturn(150000, 3, 1000, 30, 20, 30)).toBeCloseTo(3.0416, 3);
    expect(breakEvenReturn(150000, 3, 1000, 30, 30, 30)).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — no se encuentra `../src/calc/mortgage`.

- [ ] **Step 3: Crear `src/calc/mortgage.ts`**

```ts
export const MAX_TERM_YEARS = 30;

export type MonthRow = {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};

export type YearRow = {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  cumInterest: number;
  cumPrincipal: number;
};

export type Summary = {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  interestPct: number;
  months: MonthRow[];
};

export type TermResult = {
  years: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  invested: number;
  netWealth: number;
  affordable: boolean;
};

export function monthlyRate(annualRatePct: number): number {
  return annualRatePct / 100 / 12;
}

export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  const i = monthlyRate(annualRatePct);
  if (n <= 0) return 0;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

export function buildSchedule(principal: number, annualRatePct: number, years: number): MonthRow[] {
  const n = Math.round(years * 12);
  const i = monthlyRate(annualRatePct);
  const payment = monthlyPayment(principal, annualRatePct, years);
  const months: MonthRow[] = [];
  let balance = principal;
  for (let m = 1; m <= n; m++) {
    const interest = balance * i;
    let principalPart = payment - interest;
    if (m === n) principalPart = balance;
    const pay = principalPart + interest;
    balance -= principalPart;
    months.push({ month: m, payment: pay, interest, principal: principalPart, balance: Math.max(balance, 0) });
  }
  return months;
}

export function aggregateByYear(months: MonthRow[]): YearRow[] {
  const years: YearRow[] = [];
  for (const row of months) {
    const idx = Math.ceil(row.month / 12) - 1;
    if (!years[idx]) {
      years[idx] = { year: idx + 1, payment: 0, interest: 0, principal: 0, balance: 0, cumInterest: 0, cumPrincipal: 0 };
    }
    const y = years[idx];
    y.payment += row.payment;
    y.interest += row.interest;
    y.principal += row.principal;
    y.balance = row.balance;
  }
  let cumInterest = 0;
  let cumPrincipal = 0;
  for (const y of years) {
    cumInterest += y.interest;
    cumPrincipal += y.principal;
    y.cumInterest = cumInterest;
    y.cumPrincipal = cumPrincipal;
  }
  return years;
}

export function summarize(principal: number, annualRatePct: number, years: number): Summary {
  const months = buildSchedule(principal, annualRatePct, years);
  const totalPaid = months.reduce((sum, m) => sum + m.payment, 0);
  const totalInterest = totalPaid - principal;
  return {
    monthlyPayment: monthlyPayment(principal, annualRatePct, years),
    totalPaid,
    totalInterest,
    interestPct: totalPaid > 0 ? (totalInterest / totalPaid) * 100 : 0,
    months,
  };
}

export function monthlyNetReturn(netReturnPct: number): number {
  return Math.pow(1 + netReturnPct / 100, 1 / 12) - 1;
}

export function investDifference(
  principal: number,
  annualRatePct: number,
  years: number,
  monthlyBudget: number,
  netReturnPct: number,
  horizonYears: number,
): TermResult {
  const months = buildSchedule(principal, annualRatePct, years);
  const n = months.length;
  const horizonMonths = Math.round(horizonYears * 12);
  const payment = monthlyPayment(principal, annualRatePct, years);
  const m = monthlyNetReturn(netReturnPct);
  let invested = 0;
  for (let month = 1; month <= horizonMonths; month++) {
    const contribution = month <= n ? monthlyBudget - payment : monthlyBudget;
    invested = invested * (1 + m) + Math.max(contribution, 0);
  }
  const totalPaid = months.reduce((sum, x) => sum + x.payment, 0);
  const balance = n > horizonMonths ? months[horizonMonths - 1].balance : 0;
  return {
    years,
    monthlyPayment: payment,
    totalPaid,
    totalInterest: totalPaid - principal,
    invested,
    netWealth: invested - balance,
    affordable: monthlyBudget + 1e-9 >= payment,
  };
}

export function compareTerms(
  principal: number,
  annualRatePct: number,
  monthlyBudget: number,
  netReturnPct: number,
  horizonYears: number,
  maxYears: number = MAX_TERM_YEARS,
): { terms: TermResult[]; best: TermResult | null } {
  const terms: TermResult[] = [];
  for (let y = 1; y <= maxYears; y++) {
    terms.push(investDifference(principal, annualRatePct, y, monthlyBudget, netReturnPct, horizonYears));
  }
  let best: TermResult | null = null;
  for (const t of terms) {
    if (!t.affordable) continue;
    if (!best || t.netWealth > best.netWealth) best = t;
  }
  return { terms, best };
}

export function breakEvenReturn(
  principal: number,
  annualRatePct: number,
  monthlyBudget: number,
  horizonYears: number,
  termA: number,
  termB: number,
): number | null {
  if (termA === termB) return null;
  const diff = (netReturnPct: number): number => {
    const a = investDifference(principal, annualRatePct, termA, monthlyBudget, netReturnPct, horizonYears);
    const b = investDifference(principal, annualRatePct, termB, monthlyBudget, netReturnPct, horizonYears);
    return a.netWealth - b.netWealth;
  };
  let lo = 0;
  let hi = 30;
  let flo = diff(lo);
  let fhi = diff(hi);
  if (flo === 0) return 0;
  if (fhi === 0) return 30;
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fm = diff(mid);
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS (todos los tests del motor).

- [ ] **Step 5: Commit**

```bash
git add src/calc/mortgage.ts tests/mortgage.test.ts
git commit -m "feat: motor de cálculo portado a TypeScript con tests"
```

---

### Task 3: Store de datos comunes y validación

**Files:**
- Create: `src/state.ts`, `tests/state.test.ts`

**Interfaces:**
- Consumes: `MAX_TERM_YEARS` de `src/calc/mortgage.ts`.
- Produces:
  - `State = { principal: number; years: number; rate: number }`
  - `StateKey = keyof State`, `Errors = Partial<Record<StateKey, string>>`
  - `DEFAULT_STATE: State`
  - `validate(state: State): Errors`
  - `Store = { get(): State; set(patch: Partial<State>): void; subscribe(listener: (s: State) => void): () => void }`
  - `createStore(initial?: State): Store`

- [ ] **Step 1: Escribir los tests (que deben fallar)**

`tests/state.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createStore, validate, DEFAULT_STATE } from '../src/state';

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
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — no se encuentra `../src/state`.

- [ ] **Step 3: Crear `src/state.ts`**

```ts
import { MAX_TERM_YEARS } from './calc/mortgage';

export type State = {
  principal: number;
  years: number;
  rate: number;
};

export type StateKey = keyof State;
export type Errors = Partial<Record<StateKey, string>>;

export const DEFAULT_STATE: State = {
  principal: 150000,
  years: 30,
  rate: 3,
};

export function validate(state: State): Errors {
  const errors: Errors = {};
  if (!(state.principal > 0)) errors.principal = 'Introduce un importe mayor que 0.';
  if (!(state.years >= 1 && state.years <= MAX_TERM_YEARS)) {
    errors.years = `El plazo debe estar entre 1 y ${MAX_TERM_YEARS} años.`;
  }
  if (!(state.rate >= 0 && state.rate <= 20)) errors.rate = 'El interés debe estar entre 0 y 20.';
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
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.ts tests/state.test.ts
git commit -m "feat: store de datos comunes con validación y suscripción"
```

---

### Task 4: Router, layout, sidebar y registro de preguntas

**Files:**
- Create: `src/router.ts`, `src/ui/layout.ts`, `src/ui/sidebar.ts`, `src/questions/types.ts`, `src/questions/index.ts`, `tests/layout.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `Store` de `src/state.ts`.
- Produces:
  - `getRoute(): string`, `navigate(id: string): void`, `onRouteChange(cb: (id: string) => void): () => void`
  - `renderLayout(root: HTMLElement): { sidebar: HTMLElement; common: HTMLElement; content: HTMLElement }`
  - `renderSidebar(nav: HTMLElement, questions: Question[], activeId: string, onSelect: (id: string) => void): void`
  - `Question = { id: string; title: string; summary: string; render: (container: HTMLElement, context: { store: Store }) => void }`
  - `questions: Question[]` (registro; en esta fase queda vacío hasta Task 6).

- [ ] **Step 1: Escribir los tests (que deben fallar)**

`tests/layout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderLayout } from '../src/ui/layout';
import { renderSidebar } from '../src/ui/sidebar';
import { getRoute, navigate } from '../src/router';
import type { Question } from '../src/questions/types';

const question = (id: string, title: string): Question => ({
  id,
  title,
  summary: '',
  render() {},
});

describe('layout', () => {
  it('crea sidebar, panel común y contenido', () => {
    const root = document.createElement('div');
    const { sidebar, common, content } = renderLayout(root);
    expect(sidebar).toBeTruthy();
    expect(common).toBeTruthy();
    expect(content).toBeTruthy();
  });
});

describe('sidebar', () => {
  it('lista las preguntas y notifica la selección', () => {
    const nav = document.createElement('nav');
    const selected: string[] = [];
    renderSidebar(nav, [question('a', 'A'), question('b', 'B')], 'a', (id) => selected.push(id));
    const buttons = nav.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain('A');
    buttons[1].click();
    expect(selected).toEqual(['b']);
  });
});

describe('router', () => {
  it('lee y escribe el hash', () => {
    navigate('tae');
    expect(getRoute()).toBe('tae');
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — no se encuentran los módulos.

- [ ] **Step 3: Crear `src/router.ts`**

```ts
export function getRoute(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

export function navigate(id: string): void {
  window.location.hash = `#/${id}`;
}

export function onRouteChange(callback: (id: string) => void): () => void {
  const handler = () => callback(getRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
```

- [ ] **Step 4: Crear los tipos y el registro**

`src/questions/types.ts`:
```ts
import type { Store } from '../state';

export type QuestionContext = { store: Store };

export type Question = {
  id: string;
  title: string;
  summary: string;
  render: (container: HTMLElement, context: QuestionContext) => void;
};
```

`src/questions/index.ts`:
```ts
import type { Question } from './types';

export const questions: Question[] = [];
```

- [ ] **Step 5: Crear `src/ui/layout.ts` y `src/ui/sidebar.ts`**

`src/ui/layout.ts`:
```ts
export type Layout = {
  sidebar: HTMLElement;
  common: HTMLElement;
  content: HTMLElement;
};

export function renderLayout(root: HTMLElement): Layout {
  root.innerHTML = `
    <div class="min-h-screen bg-canvas text-ink">
      <div class="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[260px_1fr] md:p-6">
        <aside class="md:sticky md:top-6 md:self-start">
          <h1 class="mb-1 text-xl font-bold">Simulador de hipotecas</h1>
          <p class="mb-4 text-sm text-muted">Sistema francés · respuestas claras</p>
          <nav id="sidebar" class="flex flex-col gap-1"></nav>
        </aside>
        <main class="min-w-0">
          <section id="common" class="mb-6 rounded-xl border border-line bg-panel p-4"></section>
          <div id="content"></div>
        </main>
      </div>
    </div>`;
  return {
    sidebar: root.querySelector<HTMLElement>('#sidebar')!,
    common: root.querySelector<HTMLElement>('#common')!,
    content: root.querySelector<HTMLElement>('#content')!,
  };
}
```

`src/ui/sidebar.ts`:
```ts
import type { Question } from '../questions/types';

export function renderSidebar(
  nav: HTMLElement,
  questions: Question[],
  activeId: string,
  onSelect: (id: string) => void,
): void {
  nav.innerHTML = questions
    .map(
      (q) => `
      <button type="button" data-id="${q.id}"
        class="rounded-lg px-3 py-2 text-left text-sm hover:bg-white ${
          q.id === activeId ? 'bg-white font-semibold shadow-sm' : 'text-muted'
        }">
        ${q.title}
      </button>`,
    )
    .join('');
  nav.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.addEventListener('click', () => onSelect(button.dataset.id!));
  });
}
```

- [ ] **Step 6: Reescribir `src/main.ts`**

```ts
import './style.css';
import { createStore } from './state';
import { questions } from './questions';
import { renderLayout } from './ui/layout';
import { renderSidebar } from './ui/sidebar';
import { getRoute, navigate, onRouteChange } from './router';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('No se encontró #app');

const store = createStore();
const { sidebar, common, content } = renderLayout(app);

function activeId(): string {
  const id = getRoute();
  if (questions.some((q) => q.id === id)) return id;
  return questions[0]?.id ?? '';
}

function renderContent(): void {
  const id = activeId();
  renderSidebar(sidebar, questions, id, (next) => navigate(next));
  content.innerHTML = '';
  const question = questions.find((q) => q.id === id);
  if (question) question.render(content, { store });
  else content.innerHTML = '<p class="text-muted">Próximamente.</p>';
}

common.textContent = '';

onRouteChange(renderContent);
store.subscribe(() => {
  const question = questions.find((q) => q.id === activeId());
  if (question) {
    content.innerHTML = '';
    question.render(content, { store });
  }
});
renderContent();
```

- [ ] **Step 7: Ejecutar tests y build**

Run: `npm test`
Expected: PASS (incluye layout/sidebar/router).

Run: `npm run build`
Expected: build correcto.

- [ ] **Step 8: Commit**

```bash
git add src/router.ts src/ui/layout.ts src/ui/sidebar.ts src/questions/types.ts src/questions/index.ts src/main.ts tests/layout.test.ts
git commit -m "feat: layout de dos columnas, sidebar, router por hash y registro de preguntas"
```

---

### Task 5: Componentes UI (tarjetas, tabla, inputs comunes)

**Files:**
- Create: `src/ui/cards.ts`, `src/ui/table.ts`, `src/ui/inputs.ts`, `tests/ui.test.ts`

**Interfaces:**
- Consumes: `Store`, `validate` de `src/state.ts`.
- Produces:
  - `Card = { label: string; value: string }`; `renderCards(container: HTMLElement, cards: Card[]): void`
  - `renderTable(container: HTMLElement, headers: string[], rows: string[][]): void`
  - `renderCommonInputs(container: HTMLElement, store: Store): void`

- [ ] **Step 1: Escribir los tests (que deben fallar)**

`tests/ui.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderCards } from '../src/ui/cards';
import { renderTable } from '../src/ui/table';
import { renderCommonInputs } from '../src/ui/inputs';
import { createStore } from '../src/state';

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
    renderTable(el, ['A', 'B'], [['1', '2'], ['3', '4']]);
    expect(el.querySelectorAll('thead th')).toHaveLength(2);
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
  });
});

describe('inputs comunes', () => {
  it('renderiza los tres campos y actualiza el store', () => {
    const el = document.createElement('div');
    const store = createStore();
    renderCommonInputs(el, store);
    const input = el.querySelector<HTMLInputElement>('input[data-key="principal"]')!;
    expect(input).toBeTruthy();
    input.value = '200000';
    input.dispatchEvent(new Event('input'));
    expect(store.get().principal).toBe(200000);
  });

  it('trata un campo vacío como inválido (NaN) y muestra el error', () => {
    const el = document.createElement('div');
    const store = createStore();
    renderCommonInputs(el, store);
    const input = el.querySelector<HTMLInputElement>('input[data-key="rate"]')!;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(Number.isNaN(store.get().rate)).toBe(true);
    expect(el.querySelector('[data-error="rate"]')!.textContent).not.toBe('');
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — no se encuentran los módulos.

- [ ] **Step 3: Crear `src/ui/cards.ts` y `src/ui/table.ts`**

`src/ui/cards.ts`:
```ts
export type Card = { label: string; value: string };

export function renderCards(container: HTMLElement, cards: Card[]): void {
  container.innerHTML = `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      ${cards
        .map(
          (c) => `
        <div class="rounded-xl border border-line bg-panel p-4">
          <span class="mb-1 block text-xs text-muted">${c.label}</span>
          <span class="block text-xl font-bold">${c.value}</span>
        </div>`,
        )
        .join('')}
    </div>`;
}
```

`src/ui/table.ts`:
```ts
export function renderTable(container: HTMLElement, headers: string[], rows: string[][]): void {
  container.innerHTML = `
    <div class="overflow-x-auto rounded-xl border border-line bg-panel">
      <table class="w-full border-collapse text-right tabular-nums">
        <thead>
          <tr>${headers
            .map((h, i) => `<th class="border-b border-line px-3 py-2 text-xs text-muted ${i === 0 ? 'text-left' : ''}">${h}</th>`)
            .join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr class="border-b border-line last:border-0 hover:bg-canvas">${r
                .map((cell, i) => `<td class="whitespace-nowrap px-3 py-2 ${i === 0 ? 'text-left' : ''}">${cell}</td>`)
                .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}
```

- [ ] **Step 4: Crear `src/ui/inputs.ts`**

```ts
import type { Store, StateKey } from '../state';
import { validate } from '../state';

type Field = { key: StateKey; label: string; min: number; max?: number; step: number };

const FIELDS: Field[] = [
  { key: 'principal', label: 'Importe a financiar (€)', min: 1, step: 1000 },
  { key: 'years', label: 'Plazo (años)', min: 1, max: 30, step: 1 },
  { key: 'rate', label: 'Interés anual TIN (%)', min: 0, max: 20, step: 0.05 },
];

function updateErrors(container: HTMLElement, store: Store): void {
  const errors = validate(store.get());
  container.querySelectorAll<HTMLElement>('[data-error]').forEach((el) => {
    const key = el.dataset.error as StateKey;
    el.textContent = errors[key] ?? '';
  });
  container.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((input) => {
    const key = input.dataset.key as StateKey;
    input.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
  });
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

  container.querySelectorAll<HTMLInputElement>('input[data-key]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.key as StateKey;
      const raw = input.value.trim();
      store.set({ [key]: raw === '' ? Number.NaN : Number(raw) } as Partial<Record<StateKey, number>>);
    });
  });

  updateErrors(container, store);
  store.subscribe(() => updateErrors(container, store));
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/cards.ts src/ui/table.ts src/ui/inputs.ts tests/ui.test.ts
git commit -m "feat: componentes de tarjetas, tabla e inputs comunes"
```

---

### Task 6: Primera pregunta — cuota mensual y coste total

**Files:**
- Create: `src/questions/monthlyPayment.ts`, `tests/monthlyPayment.test.ts`
- Modify: `src/questions/index.ts`, `src/main.ts`

**Interfaces:**
- Consumes: `Question`, `summarize`, `aggregateByYear`, `validate`, `renderCards`, `renderTable`, `eur`, `pct`, `Store`.
- Produces: `monthlyPaymentQuestion: Question`; el registro `questions` pasa a `[monthlyPaymentQuestion]`.

- [ ] **Step 1: Escribir el test de integración (que debe fallar)**

`tests/monthlyPayment.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createStore } from '../src/state';
import { questions } from '../src/questions';

describe('pregunta: cuota mensual y coste total', () => {
  it('muestra los valores del escenario por defecto', () => {
    const store = createStore();
    const container = document.createElement('div');
    const question = questions.find((q) => q.id === 'cuota')!;
    question.render(container, { store });
    expect(container.textContent).toContain('632,41');
    expect(container.textContent).toContain('77.666,18');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(30);
  });

  it('pide corregir los datos si son inválidos', () => {
    const store = createStore();
    store.set({ years: Number.NaN });
    const container = document.createElement('div');
    const question = questions.find((q) => q.id === 'cuota')!;
    question.render(container, { store });
    expect(container.textContent).toContain('Corrige');
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — `questions` está vacío (no existe `id === 'cuota'`).

- [ ] **Step 3: Crear `src/questions/monthlyPayment.ts`**

```ts
import type { Question } from './types';
import { summarize, aggregateByYear } from '../calc/mortgage';
import { validate } from '../state';
import { eur, pct } from '../format';
import { renderCards } from '../ui/cards';
import { renderTable } from '../ui/table';

export const monthlyPaymentQuestion: Question = {
  id: 'cuota',
  title: '¿Cuánto pago al mes y en total?',
  summary: 'Cuota mensual, intereses totales, total pagado y cuadro anual.',
  render(container, { store }) {
    const state = store.get();
    if (Object.keys(validate(state)).length > 0) {
      container.innerHTML = '<p class="text-danger">Corrige los datos para ver los resultados.</p>';
      return;
    }
    const summary = summarize(state.principal, state.rate, state.years);
    const cards = document.createElement('div');
    const table = document.createElement('div');
    table.className = 'mt-4';
    container.innerHTML = '<h2 class="mb-3 text-lg font-semibold">Cuota mensual y coste total</h2>';
    container.append(cards, table);
    renderCards(cards, [
      { label: 'Cuota mensual', value: eur.format(summary.monthlyPayment) },
      { label: 'Intereses totales', value: eur.format(summary.totalInterest) },
      { label: 'Total pagado', value: eur.format(summary.totalPaid) },
      { label: '% intereses', value: pct.format(summary.interestPct) },
    ]);
    renderTable(
      table,
      ['Año', 'Cuota anual', 'Intereses', 'Principal', 'Capital pendiente', 'Intereses acum.', 'Principal acum.'],
      aggregateByYear(summary.months).map((r) => [
        String(r.year),
        eur.format(r.payment),
        eur.format(r.interest),
        eur.format(r.principal),
        eur.format(r.balance),
        eur.format(r.cumInterest),
        eur.format(r.cumPrincipal),
      ]),
    );
  },
};
```

- [ ] **Step 4: Registrar la pregunta**

`src/questions/index.ts`:
```ts
import type { Question } from './types';
import { monthlyPaymentQuestion } from './monthlyPayment';

export const questions: Question[] = [monthlyPaymentQuestion];
```

- [ ] **Step 5: Conectar el panel de datos comunes en `src/main.ts`**

Sustituir la línea `common.textContent = '';` por:
```ts
renderCommonInputs(common, store);
```
y añadir el import al inicio:
```ts
import { renderCommonInputs } from './ui/inputs';
```

- [ ] **Step 6: Ejecutar tests y build**

Run: `npm test`
Expected: PASS (todos, incluida la integración de la pregunta).

Run: `npm run build`
Expected: build correcto; `dist/` generado.

- [ ] **Step 7: Commit**

```bash
git add src/questions/monthlyPayment.ts src/questions/index.ts src/main.ts tests/monthlyPayment.test.ts
git commit -m "feat: primera pregunta (cuota mensual y coste total) y panel de datos comunes"
```

---

## Self-Review

**Cobertura del spec (Fase 1):**
- Scaffold Vite+TS+Tailwind → Task 1.
- Design system (tokens Tailwind) → Task 1.
- Layout de dos columnas + sidebar → Task 4.
- Store de datos comunes + validación → Task 3.
- Router por hash → Task 4.
- Registro de preguntas ampliable → Task 4 (tipos + registro) y Task 6 (primera pregunta).
- Motor portado con tests y valores de referencia → Task 2.
- Primera pregunta (cuota y coste total) → Task 6.
- Build estático → Tasks 1, 4, 6.
- Fases 2–4 (gráficas con Chart.js, preguntas restantes, TAE, amortización anticipada, escenarios, pulido): plan propio posterior.

**Placeholders:** ninguno; todas las tareas incluyen código y comandos concretos.

**Consistencia de tipos:** `State`/`Store` (Task 3) se consumen con esas firmas en Tasks 4–6. `Question` (Task 4) se implementa en Task 6. `renderCards`/`renderTable`/`renderCommonInputs` (Task 5) se usan en Task 6. `MAX_TERM_YEARS` se define en Task 2 y se importa en Task 3. Los nombres de funciones del motor coinciden con el `legacy/verify.mjs` portado.
