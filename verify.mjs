import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const start = html.indexOf('// --- CALC START ---');
const end = html.indexOf('// --- CALC END ---');
if (start === -1 || end === -1) throw new Error('No se encontraron los marcadores de cálculo');

const code = html.slice(start, end);
const factory = new Function(
  `${code}; return { monthlyPayment, buildSchedule, aggregateByYear, summarize, monthlyNetReturn, investDifference, compareTerms, breakEvenReturn };`
);
const {
  monthlyPayment, buildSchedule, aggregateByYear, summarize,
  monthlyNetReturn, investDifference, compareTerms, breakEvenReturn,
} = factory();

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
approx(s.totalPaid, 227666.18, 0.5, 'total pagado 150k/30a/3%');
approx(s.interestPct, 34.114, 0.01, 'porcentaje de intereses');
assert(s.months.length === 360, 'summarize devuelve 360 meses');

const z = summarize(150000, 0, 30);
approx(z.monthlyPayment, 416.6667, 0.0001, 'cuota con tipo 0%');
approx(z.totalInterest, 0, 0.0001, 'intereses con tipo 0%');
assert(z.interestPct === 0, 'porcentaje de intereses con tipo 0% es 0');

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

const lastYear = aggregateByYear(buildSchedule(150000, 3, 30)).at(-1);
approx(lastYear.cumPrincipal, 150000, 0.01, 'principal acumulado final = importe');
approx(lastYear.cumInterest, 77666.18, 0.5, 'intereses acumulados finales 150k/30a/3%');

approx(monthlyNetReturn(0), 0, 1e-12, 'tipo mensual equivalente con rentabilidad 0%');
approx(monthlyNetReturn(5), 0.00407412, 1e-8, 'tipo mensual equivalente con rentabilidad 5%');

const inv = investDifference(150000, 3, 30, 1000, 0, 30);
approx(inv.monthlyPayment, 632.41, 0.01, 'comparador: cuota 150k/30a/3%');
approx(inv.totalInterest, 77666.18, 0.5, 'comparador: intereses totales');
approx(inv.invested, 132333.82, 0.5, 'comparador: invertido a rentabilidad 0% = presupuesto - total pagado');
approx(inv.netWealth, inv.invested, 1e-6, 'comparador: sin deuda, patrimonio = invertido');
assert(inv.affordable === true, 'comparador: 1000 EUR/mes asumible para 30 años');
assert(investDifference(150000, 3, 30, 600, 0, 30).affordable === false, 'comparador: 600 EUR/mes no asumible para 30 años');

const w10 = investDifference(150000, 3, 10, 1000, 0, 30).netWealth;
const w30 = investDifference(150000, 3, 30, 1000, 0, 30).netWealth;
const w50 = investDifference(150000, 3, 50, 1000, 0, 30).netWealth;
assert(w10 > w30 && w30 > w50, 'comparador: a rentabilidad 0% el patrimonio baja al alargar el plazo');

const cmp = compareTerms(150000, 3, 1000, 5, 30);
assert(cmp.terms.length === 50, 'comparador: 50 plazos evaluados');
assert(cmp.best.years === 50, 'comparador: con 5% neto y 1000 EUR/mes el óptimo es 50 años');
approx(cmp.best.netWealth, 334492.78, 1, 'comparador: patrimonio del óptimo');

approx(breakEvenReturn(150000, 3, 632.406050594184, 50, 30, 50), 3.0416, 0.001, 'rentabilidad de indiferencia 30 vs 50 años');
assert(breakEvenReturn(150000, 3, 1000, 30, 30, 30) === null, 'rentabilidad de indiferencia con plazos iguales es null');

if (failures) { console.error(`\n${failures} fallo(s)`); process.exit(1); }
console.log('\nTodo correcto');
