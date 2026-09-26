# App pública de hipotecas — Diseño

Fecha: 2026-09-26
Estado: diseño aprobado en conversación; pendiente de revisión del spec escrito.

## Objetivo

Convertir el simulador personal (actual `index.html` de un solo archivo) en una
aplicación pública, estática y ampliable, que responda a varias preguntas sobre
hipotecas, permita comparar escenarios y muestre gráficas claras, con un aspecto
profesional.

## Alcance

Dentro:
- Reescritura como SPA estática con Vite + TypeScript + Tailwind CSS + Chart.js.
- Layout de dos columnas: índice de preguntas (izquierda) y contenido (derecha).
- Sistema de preguntas ampliable mediante un registro de módulos.
- Estado compartido de datos comunes + campos extra por pregunta.
- Preguntas v1:
  1. Cuota mensual y coste total.
  2. Cuadro de amortización anual.
  3. La ecuación de la cuota (sistema francés).
  4. Composición anual (principal vs intereses + capital pendiente).
  5. Cuota mensual según el plazo.
  6. ¿Cuántos años conviene? (coste de oportunidad / rentabilidad de indiferencia).
  7. TIN vs TAE.
  8. Amortización anticipada.
  9. Comparar escenarios.
- Motor de cálculo portado desde el código actual, con tests.
- Tests del motor con Vitest.

Fuera (YAGNI):
- Backend, cuentas de usuario, persistencia o compartir estado por URL.
- Hipoteca variable y euríbor (se valorará más adelante).
- Capacidad de endeudamiento y alquiler vs compra (se valorarán más adelante).
- Multi-idioma: solo español (textos centralizados para poder traducir después).
- Hosting concreto: se decidirá más adelante; el diseño es compatible con
  cualquier hosting estático.

## Decisiones

- **Stack:** Vite + TypeScript (vanilla, sin framework de UI) + Tailwind CSS +
  Chart.js. Salida estática en `dist/`.
- **Sin backend ni persistencia.** Todo en memoria.
- **Enrutado por hash** (`#/cuota`, `#/tae`, …), sin librería de router: cada
  pregunta es enlazable y funciona en estático.
- **Layout de dos columnas**; en móvil el índice pasa arriba.
- **Tooling:** TypeScript estricto, Vitest, Biome (lint + formato).
- **Migración:** se conserva la app actual en `legacy/` como referencia hasta
  alcanzar la paridad; el historial de git ya la preserva.

## Arquitectura

SPA de una sola página con:

- **Store central** (`src/state.ts`): datos comunes (importe, plazo, interés, y
  presupuesto/rentabilidad/horizonte del comparador) + campos extra por pregunta
  + escenarios. Publica cambios (pub/sub) y repinta la pregunta activa con
  debounce. Validación inline por campo.
- **Registro de preguntas** (`src/questions/index.ts`): array ordenado de
  módulos. Cada módulo declara:
  - `id`, `titulo`, `resumen` (texto corto para el índice),
  - `camposExtra` (esquema opcional de campos propios),
  - `render(contenedor, estado)`.
  Añadir una pregunta = añadir un módulo al registro.
- **Router por hash** (`src/router.ts`): muestra la pregunta activa según el hash
  y resalta su entrada en el índice.
- **Layout** (`src/ui/layout.ts`): shell de dos columnas, sidebar con el índice y
  contenedor de contenido.

### Estructura de archivos

```
index.html                 # entrada de Vite
vite.config.ts
tailwind.config.js
postcss.config.js
tsconfig.json
package.json
biome.json
src/
  main.ts                  # arranque: layout + registro + router + render inicial
  router.ts                # enrutado por hash
  state.ts                 # store, esquema de campos comunes, validación, pub/sub
  format.ts                # formato es-ES (EUR, porcentajes)
  calc/
    mortgage.ts            # motor puro (portado del actual)
    tae.ts                 # TAE desde TIN + comisiones
    earlyRepayment.ts      # amortización anticipada
    scenarios.ts           # comparación de escenarios
  ui/
    layout.ts
    sidebar.ts
    inputs.ts              # panel de datos comunes + campos
    cards.ts
    table.ts               # tabla genérica
    chart.ts               # wrappers de Chart.js
  questions/
    index.ts               # registro
    monthlyPayment.ts
    schedule.ts
    equation.ts
    composition.ts
    paymentVsTerm.ts
    termComparator.ts
    tae.ts
    earlyRepayment.ts
    scenarioCompare.ts
tests/
  mortgage.test.ts         # portado de verify.mjs (mismos valores de referencia)
  tae.test.ts
  earlyRepayment.test.ts
  scenarios.test.ts
legacy/
  index.html               # app actual (referencia)
  verify.mjs
```

## Motor de cálculo

Funciones puras portadas desde el código actual (mismos nombres y firmas),
en `src/calc/mortgage.ts`:

- `monthlyPayment(principal, annualRatePct, years)`: `C = P·i / (1 − (1+i)^−n)`,
  con `i = TIN/100/12`, `n = años×12`; si `i = 0`, `C = P/n`.
- `buildSchedule(principal, annualRatePct, years)`: cuadro mensual; la última
  cuota ajusta el residual para cerrar en 0.
- `aggregateByYear(months)`: agregación anual con acumulados.
- `summarize(principal, annualRatePct, years)`: cuota, total pagado, intereses,
  % intereses, meses.
- `monthlyNetReturn(netReturnPct)`, `investDifference(...)`,
  `compareTerms(...)`, `breakEvenReturn(...)`: comparador de plazos.
- `MAX_TERM_YEARS = 30`.

Nuevas (`src/calc/tae.ts`):

- `tae(principal, annualRatePct, years, aperturaPct, segurosMensuales)`: resuelve
  por bisección el tipo mensual que cumple
  `Σ (C + seguros) / (1+i)^k = P − apertura`, con `C` la cuota; `TAE = (1+i)^12 − 1`.
  Aproximación basada en comisión de apertura y gastos mensuales.

Nuevas (`src/calc/earlyRepayment.ts`):

- `earlyRepayment(principal, annualRatePct, years, mesPago, importe, modo)`: con
  `modo` = `reducir-plazo` o `reducir-cuota`, recalcula el cuadro tras el pago
  parcial y devuelve intereses totales, ahorro de intereses y nuevo plazo/cuota.

Nuevas (`src/calc/scenarios.ts`):

- `buildScenario(base, overrides)`: escenario a partir del estado común.
- `compareScenarios(base, escenarios)`: métricas comparables (cuota, intereses
  totales, total pagado, TAE) para tabla y gráfica.

## UI y componentes

- Tailwind con design tokens (color, tipografía, espaciado, radios).
- Componentes reutilizables: layout, sidebar/índice, panel de inputs, tarjetas
  de resumen, tabla genérica y wrappers de Chart.js (línea, barras apiladas,
  área).
- Accesibilidad: HTML semántico, etiquetas asociadas, `aria`, foco visible.
- Responsive: dos columnas en escritorio, índice colapsado en móvil.
- Cada pregunta muestra: campos extra (si los tiene), resultados, gráfica(s) y
  un texto explicativo breve.

## Testing y tooling

- Vitest para el motor, con los mismos valores de referencia del `verify.mjs`
  actual (cuota 150k/30a/3% ≈ 632,41 €; intereses ≈ 77.666,18 €; capital final 0;
  comparador: 30 plazos, óptimo 30 años con 5 % neto y 1.000 €/mes; rentabilidad
  de indiferencia 20 vs 30 años ≈ 3,0416 %).
- TypeScript estricto; Biome para lint y formato.
- Opcional futuro: Playwright para un smoke e2e.

## Migración por fases

- **Fase 1:** scaffold Vite+TS+Tailwind+Chart.js, design system, layout de dos
  columnas, store, router, motor portado con tests verdes y la primera pregunta
  (cuota mensual y coste total).
- **Fase 2:** portar las preguntas actuales (cuadro, ecuación, composición,
  cuota/plazo, comparador de plazos).
- **Fase 3:** TIN vs TAE, amortización anticipada y comparador de escenarios.
- **Fase 4:** pulido, accesibilidad, responsive, build estático.

## Verificación

- `npm test` (Vitest) verde con los valores de referencia.
- `npm run build` genera `dist/` estático sin dependencias de servidor.
- Comprobación manual en navegador de cada pregunta y del layout responsive.

## Riesgos y decisiones abiertas

- **Hosting:** sin decidir; el resultado es estático y compatible con Cloudflare
  Pages, GitHub Pages o Netlify.
- **Alcance de TAE:** aproximación con comisión de apertura y gastos mensuales;
  no reproduce al detalle la normativa de TAE (no incluye todos los casos).
- **Amortización anticipada:** v1 admite una amortización puntual; múltiples
  amortizaciones se valorarán más adelante.
