# Plan de implementación: Simulador de hipotecas (sistema francés)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una página HTML de un solo archivo que simule hipotecas a tipo fijo con el sistema francés y muestre cuota, cuadro anual, ecuación y gráficas.

**Architecture:** Un único `index.html` con HTML, CSS y JS vanilla embebidos (sin build ni dependencias). El motor de cálculo son funciones puras delimitadas por marcadores `// --- CALC START/END ---`, extraíbles y testeables desde Node con `verify.mjs`. El render se reconstruye completo en cada cambio de entrada (con debounce), sin framework.

**Tech Stack:** HTML5, CSS, JavaScript vanilla (ES2020), SVG generado con `document.createElementNS`, Node.js (`node:fs`, `node:assert` implícito por comprobaciones manuales) para verificación, Chromium headless para smoke test del DOM.

**Spec:** `docs/superpowers/specs/2026-09-24-simulador-hipotecas-design.md`

## Global Constraints

- Un único archivo de aplicación: `index.html` en la raíz del proyecto. Sin CDN, sin librerías, sin build. Debe funcionar abierto con doble clic (`file://`) y sin internet.
- Idioma de la interfaz: español. Moneda: EUR. Formato numérico es-ES (miles `.`, decimales `,`).
- Entradas: importe (€) > 0; años entre 1 y 50; interés TIN (%) entre 0 y 20. Validación inline; no se renderiza tabla/gráficas si hay error.
- Modelo: `i = TIN / 100 / 12`, `n = años * 12`, `C = P·i / (1 − (1+i)^−n)`; si `i = 0`, `C = P / n`. Última cuota ajusta el residual para cerrar el capital en 0.
- Sin tests automatizados de framework; la verificación usa `node verify.mjs` (matemática) y Chromium headless (DOM).
- No hay repositorio git todavía. Si el humano aprueba versionar, ejecutar `git init` antes del primer commit; los pasos "Commit" solo se ejecutan en ese caso.

---

## Estructura de archivos

- `index.html` — toda la aplicación: estilos, motor de cálculo, render de entradas, tarjetas, tabla, ecuación y gráficas.
- `verify.mjs` — herramienta de desarrollo sin dependencias que extrae el bloque de cálculo de `index.html` y comprueba valores de referencia. No se necesita para usar la página.

Comandos de verificación reutilizados:

```bash
node verify.mjs
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html
```

---

### Task 1: Motor de cálculo + arnés de verificación

**Files:**
- Create: `index.html`
- Create: `verify.mjs`

**Interfaces:**
- Produces:
  - `monthlyPayment(principal: number, annualRatePct: number, years: number): number`
  - `buildSchedule(principal, annualRatePct, years): Array<{ month, payment, interest, principal, balance }>` (longitud `years*12`)
  - `aggregateByYear(months): Array<{ year, payment, interest, principal, balance, cumInterest, cumPrincipal }>`
  - `summarize(principal, annualRatePct, years): { monthlyPayment, totalPaid, totalInterest, interestPct, months }`

- [ ] **Step 1: (Opcional, solo si se aprueba git) inicializar repositorio**

```bash
cd /home/chicote/Work/hipotecas && git init
```

- [ ] **Step 2: Escribir `verify.mjs` (el test que debe fallar primero)**

```js
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const start = html.indexOf('// --- CALC START ---');
const end = html.indexOf('// --- CALC END ---');
if (start === -1 || end === -1) throw new Error('No se encontraron los marcadores de cálculo');

const code = html.slice(start, end);
const factory = new Function(
  `${code}; return { monthlyPayment, buildSchedule, aggregateByYear, summarize };`
);
const { monthlyPayment, buildSchedule, aggregateByYear, summarize } = factory();

let failures = 0;
const approx = (actual, expected, tol, label) => {
  if (Math.abs(actual - expected) > tol) {
    console.error(`FAIL ${label}: ${actual} != ${expected}`);
    failures++;
  } else console.log(`ok   ${label}`);
};
const assert = (cond, label) => {
  if (!cond) { console.error(`FAIL ${label}`); failures++; } else console.log(`ok   ${label}`);
};

const s = summarize(150000, 3, 30);
approx(s.monthlyPayment, 632.41, 0.01, 'cuota 150k/30a/3%');
approx(s.totalInterest, 77666.18, 0.5, 'intereses totales 150k/30a/3%');
approx(s.interestPct, 34.114, 0.01, 'porcentaje de intereses');

const z = summarize(150000, 0, 30);
approx(z.monthlyPayment, 416.6667, 0.0001, 'cuota con tipo 0%');
approx(z.totalInterest, 0, 0.0001, 'intereses con tipo 0%');

const months = buildSchedule(150000, 3, 30);
assert(months.length === 360, '360 cuotas mensuales');
approx(months[months.length - 1].balance, 0, 1e-6, 'capital final exactamente 0');
approx(months.reduce((a, m) => a + m.principal, 0), 150000, 0.01, 'suma de principal = importe');

const years = aggregateByYear(months);
assert(years.length === 30, '30 filas anuales');
approx(
  years[0].interest,
  months.slice(0, 12).reduce((a, m) => a + m.interest, 0),
  0.01,
  'intereses del año 1 coinciden con los 12 primeros meses'
);

if (failures) { console.error(`\n${failures} fallo(s)`); process.exit(1); }
console.log('\nTodo correcto');
```

- [ ] **Step 3: Ejecutar el test y ver que falla**

Run: `node verify.mjs`
Expected: FAIL — error `ENOENT` porque `index.html` no existe todavía.

- [ ] **Step 4: Crear `index.html` con el esqueleto y el motor de cálculo**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulador de hipotecas · sistema francés</title>
<style>
  :root {
    --bg: #f6f7f9; --panel: #ffffff; --ink: #1c2430; --muted: #6b7686;
    --line: #dde3ea; --accent: #2f6df6; --interest: #f0713a; --principal: #2f6df6;
    --balance: #7a3df0; --danger: #c0392b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 980px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 1.6rem; margin: 0 0 4px; }
  h2 { font-size: 1.15rem; margin: 0 0 12px; }
  .subtitle { color: var(--muted); margin: 0 0 20px; }
  .panel {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 18px; margin-bottom: 18px;
  }
  .inputs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .inputs label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; font-size: .9rem; }
  .inputs input {
    padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px;
    font-size: 1rem; background: #fff; color: var(--ink);
  }
  .inputs input:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
  .error { color: var(--danger); font-size: .8rem; font-weight: 500; min-height: 1em; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
  .card-label { display: block; color: var(--muted); font-size: .8rem; margin-bottom: 6px; }
  .card-value { display: block; font-size: 1.25rem; font-weight: 700; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { padding: 8px 10px; text-align: right; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th:first-child, td:first-child { text-align: left; }
  thead th { position: sticky; top: 0; background: var(--panel); color: var(--muted); font-size: .8rem; }
  tbody tr:hover { background: #f2f5fb; }
  .formula { font-size: 1.3rem; display: flex; align-items: center; gap: 10px; margin: 8px 0 16px; }
  .frac { display: inline-flex; flex-direction: column; text-align: center; vertical-align: middle; }
  .frac .num { border-bottom: 2px solid var(--ink); padding: 0 6px 2px; }
  .frac .den { padding: 2px 6px 0; }
  .legend { margin: 0 0 14px; padding-left: 18px; color: var(--muted); }
  .legend b { color: var(--ink); }
  .substitution { background: #eef3ff; border-radius: 8px; padding: 10px 12px; }
  .note { color: var(--muted); font-size: .9rem; }
  .chart-legend { display: flex; gap: 18px; flex-wrap: wrap; color: var(--muted); font-size: .85rem; margin-bottom: 8px; }
  .swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
  svg { width: 100%; height: auto; display: block; }
  .axis { stroke: var(--line); stroke-width: 1; }
  .grid { stroke: var(--line); stroke-width: 1; stroke-dasharray: 3 3; }
  .bar-principal { fill: var(--principal); }
  .bar-interest { fill: var(--interest); }
  .balance-line { fill: none; stroke: var(--balance); stroke-width: 2; }
  .marker { fill: var(--accent); stroke: #fff; stroke-width: 2; }
  .tick { fill: var(--muted); font-size: 11px; }
  @media (max-width: 720px) {
    .inputs, .summary { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>
<main>
  <h1>Simulador de hipotecas</h1>
  <p class="subtitle">Sistema francés de amortización · cuota constante</p>
</main>
<script>
// --- CALC START ---
function monthlyRate(annualRatePct) {
  return annualRatePct / 100 / 12;
}

function monthlyPayment(principal, annualRatePct, years) {
  const n = Math.round(years * 12);
  const i = monthlyRate(annualRatePct);
  if (n <= 0) return 0;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

function buildSchedule(principal, annualRatePct, years) {
  const n = Math.round(years * 12);
  const i = monthlyRate(annualRatePct);
  const payment = monthlyPayment(principal, annualRatePct, years);
  const months = [];
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

function aggregateByYear(months) {
  const years = [];
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
  let cumInterest = 0, cumPrincipal = 0;
  for (const y of years) {
    cumInterest += y.interest;
    cumPrincipal += y.principal;
    y.cumInterest = cumInterest;
    y.cumPrincipal = cumPrincipal;
  }
  return years;
}

function summarize(principal, annualRatePct, years) {
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
// --- CALC END ---
</script>
</body>
</html>
```

- [ ] **Step 5: Ejecutar el test y ver que pasa**

Run: `node verify.mjs`
Expected: todas las líneas `ok` y `Todo correcto`.

- [ ] **Step 6: Commit (solo si se aprobó git)**

```bash
git add index.html verify.mjs
git commit -m "feat: motor de cálculo de hipoteca (sistema francés) + verificación"
```

---

### Task 2: Entradas, validación, tarjetas resumen y recálculo en vivo

**Files:**
- Modify: `index.html` (añadir HTML tras `<p class="subtitle">…</p>` y JS tras el bloque `// --- CALC END ---`)

**Interfaces:**
- Consumes: `summarize`, `monthlyPayment` (Task 1).
- Produces:
  - `readInputs(): { principal, years, rate, valid }`
  - `render(): void`
  - `scheduleRender(): void` (debounce 150 ms)
  - IDs de DOM: `principal`, `years`, `rate`, `err-principal`, `err-years`, `err-rate`, `out-payment`, `out-interest`, `out-total`, `out-pct`.

- [ ] **Step 1: Añadir el marcado de entradas y resumen**

Insertar dentro de `<main>`, justo después del `<p class="subtitle">…</p>`:

```html
  <section class="panel inputs">
    <label>Importe a financiar (€)
      <input id="principal" type="number" min="1" step="1000" value="150000">
      <span class="error" id="err-principal"></span>
    </label>
    <label>Plazo (años)
      <input id="years" type="number" min="1" max="50" step="1" value="30">
      <span class="error" id="err-years"></span>
    </label>
    <label>Interés anual TIN (%)
      <input id="rate" type="number" min="0" max="20" step="0.05" value="3">
      <span class="error" id="err-rate"></span>
    </label>
  </section>

  <section class="panel summary">
    <div class="card"><span class="card-label">Cuota mensual</span><span class="card-value" id="out-payment">—</span></div>
    <div class="card"><span class="card-label">Intereses totales</span><span class="card-value" id="out-interest">—</span></div>
    <div class="card"><span class="card-label">Total pagado</span><span class="card-value" id="out-total">—</span></div>
    <div class="card"><span class="card-label">% intereses</span><span class="card-value" id="out-pct">—</span></div>
  </section>
```

- [ ] **Step 2: Añadir el JS de lectura y render**

Insertar justo después de la línea `// --- CALC END ---`, dentro del mismo `<script>`:

```js
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const els = {
  principal: document.getElementById('principal'),
  years: document.getElementById('years'),
  rate: document.getElementById('rate'),
};

function readInputs() {
  const principal = Number(els.principal.value);
  const years = Number(els.years.value);
  const rate = Number(els.rate.value);
  const errors = { principal: '', years: '', rate: '' };
  if (!(principal > 0)) errors.principal = 'Introduce un importe mayor que 0.';
  if (!(years >= 1 && years <= 50)) errors.years = 'El plazo debe estar entre 1 y 50 años.';
  if (!(rate >= 0 && rate <= 20)) errors.rate = 'El interés debe estar entre 0 y 20.';
  document.getElementById('err-principal').textContent = errors.principal;
  document.getElementById('err-years').textContent = errors.years;
  document.getElementById('err-rate').textContent = errors.rate;
  return { principal, years, rate, valid: !errors.principal && !errors.years && !errors.rate };
}

function render() {
  const { principal, years, rate, valid } = readInputs();
  if (!valid) return;
  const s = summarize(principal, rate, years);
  document.getElementById('out-payment').textContent = eur.format(s.monthlyPayment);
  document.getElementById('out-interest').textContent = eur.format(s.totalInterest);
  document.getElementById('out-total').textContent = eur.format(s.totalPaid);
  document.getElementById('out-pct').textContent = `${pctFmt.format(s.interestPct)} %`;
}

let renderTimer;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 150);
}

Object.values(els).forEach((el) => el.addEventListener('input', scheduleRender));
render();
```

- [ ] **Step 3: Verificar el render con Chromium headless**

Run:
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -o '632,41'
```
Expected: imprime `632,41`.

- [ ] **Step 4: Verificar que la matemática sigue correcta**

Run: `node verify.mjs`
Expected: `Todo correcto`.

- [ ] **Step 5: Commit (solo si se aprobó git)**

```bash
git add index.html
git commit -m "feat: entradas, validación y tarjetas resumen con recálculo en vivo"
```

---

### Task 3: Cuadro de amortización anual

**Files:**
- Modify: `index.html` (HTML antes del cierre `</main>`, JS en `render`)

**Interfaces:**
- Consumes: `aggregateByYear`, `buildSchedule`, `eur`.
- Produces: `renderTable(principal, rate, years): void`; tabla con `id="schedule"`.

- [ ] **Step 1: Añadir la sección de tabla**

Insertar dentro de `<main>`, tras la sección `.summary`:

```html
  <section class="panel">
    <h2>Cuadro de amortización anual</h2>
    <div class="table-wrap">
      <table id="schedule">
        <thead>
          <tr>
            <th>Año</th><th>Cuota anual</th><th>Intereses</th><th>Principal</th>
            <th>Capital pendiente</th><th>Intereses acum.</th><th>Principal acum.</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </section>
```

- [ ] **Step 2: Añadir `renderTable` y llamarla desde `render`**

Insertar la función antes de `function render()`:

```js
function renderTable(principal, rate, years) {
  const rows = aggregateByYear(buildSchedule(principal, rate, years));
  document.querySelector('#schedule tbody').innerHTML = rows.map((r) => `
    <tr>
      <td>${r.year}</td>
      <td>${eur.format(r.payment)}</td>
      <td>${eur.format(r.interest)}</td>
      <td>${eur.format(r.principal)}</td>
      <td>${eur.format(r.balance)}</td>
      <td>${eur.format(r.cumInterest)}</td>
      <td>${eur.format(r.cumPrincipal)}</td>
    </tr>`).join('');
}
```

Y dentro de `render()`, tras la línea de `out-pct`, añadir:

```js
  renderTable(principal, rate, years);
```

- [ ] **Step 3: Verificar número de filas y cierre de capital**

Run:
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -o '<tr>' | wc -l
```
Expected: `31` (1 cabecera + 30 años).

- [ ] **Step 4: Verificar la última fila (año 30, capital pendiente 0)**

Run:
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -o '<td>30</td>'
```
Expected: imprime `<td>30</td>`.

- [ ] **Step 5: Commit (solo si se aprobó git)**

```bash
git add index.html
git commit -m "feat: cuadro de amortización anual"
```

---

### Task 4: Panel de la ecuación (sistema francés)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `monthlyPayment`, `eur`.
- Produces: `renderEquation(principal, rate, years): void`; contenedor `id="substitution"`.

- [ ] **Step 1: Añadir la sección de ecuación**

Insertar dentro de `<main>`, tras la sección de tabla:

```html
  <section class="panel">
    <h2>La ecuación de la cuota (sistema francés)</h2>
    <div class="formula">
      <span>C</span> =
      <span class="frac">
        <span class="num">P · i</span>
        <span class="den">1 − (1 + i)<sup>−n</sup></span>
      </span>
    </div>
    <ul class="legend">
      <li><b>C</b> — cuota mensual.</li>
      <li><b>P</b> — importe financiado.</li>
      <li><b>i</b> — tipo de interés mensual = TIN / 100 / 12.</li>
      <li><b>n</b> — número total de cuotas = años × 12.</li>
    </ul>
    <div class="substitution" id="substitution"></div>
    <p class="note">
      Al <b>alargar el plazo</b> (n mayor) la cuota baja pero pagas más intereses en total.
      Al <b>subir el interés</b> (i mayor) suben tanto la cuota como el total de intereses.
    </p>
  </section>
```

- [ ] **Step 2: Añadir `renderEquation` y llamarla**

Insertar antes de `function render()`:

```js
function renderEquation(principal, rate, years) {
  const n = Math.round(years * 12);
  const i = rate / 100 / 12;
  const rateFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 });
  const cuota = monthlyPayment(principal, rate, years);
  document.getElementById('substitution').innerHTML =
    `Con tus datos: P = ${eur.format(principal)}, ` +
    `i = ${rateFmt.format(i)}, n = ${n} cuotas → ` +
    `<b>C = ${eur.format(cuota)}</b>`;
}
```

Y dentro de `render()`, tras `renderTable(...)`, añadir:

```js
  renderEquation(principal, rate, years);
```

- [ ] **Step 3: Verificar la sustitución de valores**

Run:
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -o 'n = 360 cuotas'
```
Expected: imprime `n = 360 cuotas`.

- [ ] **Step 4: Commit (solo si se aprobó git)**

```bash
git add index.html
git commit -m "feat: panel explicativo de la ecuación francesa con sustitución"
```

---

### Task 5: Gráfica 1 — composición anual + capital pendiente (SVG)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `aggregateByYear`, `buildSchedule`.
- Produces:
  - `svgEl(tag: string, attrs: object): SVGElement`
  - `renderCompositionChart(principal, rate, years): void`; contenedor `id="chart-composition"`.

- [ ] **Step 1: Añadir la sección de gráficas**

Insertar dentro de `<main>`, tras la sección de ecuación:

```html
  <section class="panel">
    <h2>Composición anual de la hipoteca</h2>
    <div class="chart-legend">
      <span><span class="swatch" style="background:var(--principal)"></span>Principal</span>
      <span><span class="swatch" style="background:var(--interest)"></span>Intereses</span>
      <span><span class="swatch" style="background:var(--balance)"></span>Capital pendiente</span>
    </div>
    <div id="chart-composition"></div>
  </section>
```

- [ ] **Step 2: Añadir `svgEl` y `renderCompositionChart`, y llamarla**

Insertar antes de `function render()`:

```js
function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function renderCompositionChart(principal, rate, years) {
  const rows = aggregateByYear(buildSchedule(principal, rate, years));
  const container = document.getElementById('chart-composition');
  container.innerHTML = '';
  const W = 720, H = 360, m = { top: 20, right: 20, bottom: 36, left: 70 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const maxPay = Math.max(...rows.map((r) => r.payment));
  const maxBal = principal;
  const bw = iw / rows.length;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Composición anual de la hipoteca' });

  for (let g = 0; g <= 4; g++) {
    const y = m.top + (ih * g) / 4;
    svg.appendChild(svgEl('line', { x1: m.left, y1: y, x2: m.left + iw, y2: y, class: 'grid' }));
    const label = svgEl('text', { x: m.left - 8, y: y + 4, class: 'tick', 'text-anchor': 'end' });
    label.textContent = eur.format(maxPay * (1 - g / 4)).replace(/\s?€/, '');
    svg.appendChild(label);
  }

  rows.forEach((r, idx) => {
    const x = m.left + idx * bw + bw * 0.15;
    const w = bw * 0.7;
    const hP = (r.principal / maxPay) * ih;
    const hI = (r.interest / maxPay) * ih;
    svg.appendChild(svgEl('rect', { x, y: m.top + ih - hP, width: w, height: hP, class: 'bar-principal' }));
    svg.appendChild(svgEl('rect', { x, y: m.top + ih - hP - hI, width: w, height: hI, class: 'bar-interest' }));
  });

  const pts = rows.map((r, idx) => {
    const x = m.left + idx * bw + bw / 2;
    const y = m.top + ih - (r.balance / maxBal) * ih;
    return `${x},${y}`;
  }).join(' ');
  svg.appendChild(svgEl('polyline', { points: pts, class: 'balance-line' }));

  const first = svgEl('text', { x: m.left, y: H - 12, class: 'tick', 'text-anchor': 'start' });
  first.textContent = 'Año 1';
  const last = svgEl('text', { x: m.left + iw, y: H - 12, class: 'tick', 'text-anchor': 'end' });
  last.textContent = `Año ${rows.length}`;
  svg.appendChild(first);
  svg.appendChild(last);

  container.appendChild(svg);
}
```

Y dentro de `render()`, tras `renderEquation(...)`, añadir:

```js
  renderCompositionChart(principal, rate, years);
```

- [ ] **Step 3: Verificar que se generan las barras**

Run:
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -o '<rect' | wc -l
```
Expected: `60` (30 años × 2 barras).

- [ ] **Step 4: Commit (solo si se aprobó git)**

```bash
git add index.html
git commit -m "feat: gráfica SVG de composición anual con capital pendiente"
```

---

### Task 6: Gráfica 2 — cuota frente al plazo (un solo tipo)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `monthlyPayment`, `svgEl`, `eur`.
- Produces: `renderPlazoChart(principal, rate, years): void`; contenedor `id="chart-plazo"`.

- [ ] **Step 1: Añadir la sección de la gráfica**

Insertar dentro de `<main>`, tras la sección de composición:

```html
  <section class="panel">
    <h2>Cuota mensual según el plazo (tu interés)</h2>
    <div id="chart-plazo"></div>
  </section>
```

- [ ] **Step 2: Añadir `renderPlazoChart` y llamarla**

Insertar antes de `function render()`:

```js
function renderPlazoChart(principal, rate, currentYears) {
  const container = document.getElementById('chart-plazo');
  container.innerHTML = '';
  const W = 720, H = 320, m = { top: 20, right: 20, bottom: 36, left: 80 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
  const years = [];
  for (let y = 1; y <= 50; y++) years.push(y);
  const values = years.map((y) => monthlyPayment(principal, rate, y));
  const maxV = Math.max(...values), minV = Math.min(...values);
  const xOf = (y) => m.left + ((y - 1) / 49) * iw;
  const yOf = (v) => m.top + ih - ((v - minV) / (maxV - minV || 1)) * ih;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Cuota mensual según el plazo' });

  for (let g = 0; g <= 4; g++) {
    const y = m.top + (ih * g) / 4;
    svg.appendChild(svgEl('line', { x1: m.left, y1: y, x2: m.left + iw, y2: y, class: 'grid' }));
    const label = svgEl('text', { x: m.left - 8, y: y + 4, class: 'tick', 'text-anchor': 'end' });
    label.textContent = eur.format(maxV - ((maxV - minV) * g) / 4).replace(/\s?€/, '');
    svg.appendChild(label);
  }

  const pts = years.map((y) => `${xOf(y)},${yOf(monthlyPayment(principal, rate, y))}`).join(' ');
  svg.appendChild(svgEl('polyline', { points: pts, class: 'balance-line', style: 'stroke: var(--accent)' }));

  const cx = xOf(currentYears);
  const cy = yOf(monthlyPayment(principal, rate, currentYears));
  svg.appendChild(svgEl('circle', { cx, cy, r: 5, class: 'marker' }));
  const tag = svgEl('text', { x: cx + 8, y: cy - 8, class: 'tick', 'text-anchor': 'start' });
  tag.textContent = `${currentYears} años · ${eur.format(monthlyPayment(principal, rate, currentYears))}`;
  svg.appendChild(tag);

  for (const y of [1, 10, 20, 30, 40, 50]) {
    const t = svgEl('text', { x: xOf(y), y: H - 12, class: 'tick', 'text-anchor': 'middle' });
    t.textContent = `${y}`;
    svg.appendChild(t);
  }

  container.appendChild(svg);
}
```

Y dentro de `render()`, tras `renderCompositionChart(...)`, añadir:

```js
  renderPlazoChart(principal, rate, years);
```

- [ ] **Step 3: Verificar que se dibuja la curva y el marcador**

Run:
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -o '<circle' | wc -l
```
Expected: `1`.

- [ ] **Step 4: Commit (solo si se aprobó git)**

```bash
git add index.html
git commit -m "feat: gráfica SVG de cuota frente al plazo para el interés introducido"
```

---

### Task 7: Pulido y verificación end-to-end

**Files:**
- Modify: `index.html` (ajustes menores de estilos/etiquetas si hicieran falta)
- Modify: `docs/superpowers/specs/2026-09-24-simulador-hipotecas-design.md` (corregir el valor de referencia de intereses a `≈ 77.666,18 €`)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: página final verificada.

- [ ] **Step 1: Revisar el render completo con varios escenarios**

Run (caso por defecto):
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -oE '632,41|77\.666,18|n = 360 cuotas' | sort -u
```
Expected: las tres coincidencias.

- [ ] **Step 2: Verificar el caso con tipo 0%**

Editar temporalmente el `value` de `#rate` a `0`, ejecutar el mismo comando y comprobar que la cuota mostrada es `416,67`; luego restaurar `value="3"`.

Run:
```bash
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom file:///home/chicote/Work/hipotecas/index.html | grep -o '416,67'
```
Expected: imprime `416,67` (solo durante la prueba; restaurar después).

- [ ] **Step 3: Verificar la matemática completa**

Run: `node verify.mjs`
Expected: `Todo correcto`.

- [ ] **Step 4: Corregir el valor de referencia en el spec**

En `docs/superpowers/specs/2026-09-24-simulador-hipotecas-design.md`, cambiar
`→ intereses totales ≈ 77.666 €.` por `→ intereses totales ≈ 77.666,18 €.`

- [ ] **Step 5: Commit final (solo si se aprobó git)**

```bash
git add index.html docs/superpowers/specs/2026-09-24-simulador-hipotecas-design.md
git commit -m "chore: verificación end-to-end y ajuste del spec"
```

---

## Self-Review

**Cobertura del spec:**
- Entradas importe/años/interés → Task 2.
- Cuota mensual y tarjetas resumen → Task 1 (cálculo) + Task 2 (render).
- Tabla anual con cuota, intereses, principal, capital pendiente y acumulados → Task 3.
- Ecuación francesa con leyenda y sustitución → Task 4.
- Gráfica composición anual + capital pendiente → Task 5.
- Gráfica cuota vs plazo con un solo tipo → Task 6.
- Validación 1–50 años, 0–20%, importe > 0, caso i=0 → Tasks 1 y 2.
- Verificación con valores de referencia → Tasks 1, 2, 7.
- Formato es-ES/EUR, un solo archivo sin dependencias → Global Constraints + Task 2.

**Placeholders:** ninguno; todas las tareas incluyen código y comandos concretos.

**Consistencia de tipos:** `monthlyPayment(principal, annualRatePct, years)`, `buildSchedule`, `aggregateByYear` y `summarize` se definen en Task 1 y se consumen con el mismo orden de argumentos en Tasks 2–6. Los IDs de DOM (`principal`, `years`, `rate`, `out-*`, `substitution`, `chart-composition`, `chart-plazo`) coinciden entre HTML y JS.
