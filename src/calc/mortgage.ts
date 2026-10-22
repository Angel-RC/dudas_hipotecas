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
  return (principal * i) / (1 - (1 + i) ** -n);
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
    months.push({
      month: m,
      payment: pay,
      interest,
      principal: principalPart,
      balance: Math.max(balance, 0),
    });
  }
  return months;
}

export function aggregateByYear(months: MonthRow[]): YearRow[] {
  const years: YearRow[] = [];
  for (const row of months) {
    const idx = Math.ceil(row.month / 12) - 1;
    if (!years[idx]) {
      years[idx] = {
        year: idx + 1,
        payment: 0,
        interest: 0,
        principal: 0,
        balance: 0,
        cumInterest: 0,
        cumPrincipal: 0,
      };
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
  return (1 + netReturnPct / 100) ** (1 / 12) - 1;
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
    terms.push(
      investDifference(principal, annualRatePct, y, monthlyBudget, netReturnPct, horizonYears),
    );
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
    const a = investDifference(
      principal,
      annualRatePct,
      termA,
      monthlyBudget,
      netReturnPct,
      horizonYears,
    );
    const b = investDifference(
      principal,
      annualRatePct,
      termB,
      monthlyBudget,
      netReturnPct,
      horizonYears,
    );
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

export type AmortizationAtYearInput = {
  principal: number;
  annualRatePct: number;
  years: number;
  amount: number;
  year: number;
};

export type AmortizationScenario = {
  monthlyPayment: number;
  interestSaved: number;
  totalInterest: number;
  totalPaid: number;
  principalPct: number;
  interestPct: number;
  monthsToPayoff: number;
};

export type AmortizationSummary = Pick<
  AmortizationScenario,
  | 'monthlyPayment'
  | 'totalInterest'
  | 'totalPaid'
  | 'principalPct'
  | 'interestPct'
  | 'monthsToPayoff'
>;

export type AmortizationComparison = {
  balanceAtAmortization: number;
  baseline: AmortizationSummary;
  term: AmortizationScenario;
  payment: AmortizationScenario;
};

function remainingLoan(
  principal: number,
  annualRatePct: number,
  months: number,
  payment: number,
): { interest: number; months: number } {
  let balance = principal;
  let interestTotal = 0;
  const rate = monthlyRate(annualRatePct);
  let monthsPaid = 0;

  while (monthsPaid < months && balance > 0) {
    const interest = balance * rate;
    interestTotal += interest;
    const paymentDue = Math.min(payment, balance + interest);
    balance = Math.max(balance - (paymentDue - interest), 0);
    monthsPaid += 1;
  }

  return { interest: interestTotal, months: monthsPaid };
}

function makeAmortizationScenario(
  principal: number,
  totalInterest: number,
  monthlyPayment: number,
  monthsToPayoff: number,
  baselineInterest: number,
): AmortizationScenario {
  const totalPaid = principal + totalInterest;
  return {
    monthlyPayment,
    interestSaved: Math.max(baselineInterest - totalInterest, 0),
    totalInterest,
    totalPaid,
    principalPct: totalPaid > 0 ? (principal / totalPaid) * 100 : 0,
    interestPct: totalPaid > 0 ? (totalInterest / totalPaid) * 100 : 0,
    monthsToPayoff,
  };
}

export function compareAmortizationAtYear({
  principal,
  annualRatePct,
  years,
  amount,
  year,
}: AmortizationAtYearInput): AmortizationComparison {
  const monthCount = Math.round(years * 12);
  const elapsedMonths = Math.round(year * 12);
  if (!Number.isInteger(year) || year < 0 || elapsedMonths >= monthCount) {
    throw new RangeError('El año de amortización debe estar dentro del plazo pendiente.');
  }
  if (!(amount > 0)) throw new RangeError('El importe de amortización debe ser mayor que 0.');

  const schedule = buildSchedule(principal, annualRatePct, years);
  const balanceAtAmortization =
    elapsedMonths === 0 ? principal : schedule[elapsedMonths - 1].balance;
  if (amount > balanceAtAmortization) {
    throw new RangeError('El importe no puede superar el saldo pendiente en el año elegido.');
  }

  const baselineInterest = schedule.reduce((total, month) => total + month.interest, 0);
  const interestBeforeAmortization = schedule
    .slice(0, elapsedMonths)
    .reduce((total, month) => total + month.interest, 0);
  const monthsAfterAmortization = monthCount - elapsedMonths;
  const originalMonthlyPayment = monthlyPayment(principal, annualRatePct, years);
  const balanceAfterAmortization = Math.max(balanceAtAmortization - amount, 0);
  const termMonthlyPayment = balanceAfterAmortization > 0 ? originalMonthlyPayment : 0;

  const termLoan = remainingLoan(
    balanceAfterAmortization,
    annualRatePct,
    monthsAfterAmortization,
    termMonthlyPayment,
  );
  const paymentAfterAmortization = monthlyPayment(
    balanceAfterAmortization,
    annualRatePct,
    monthsAfterAmortization / 12,
  );
  const paymentLoan = remainingLoan(
    balanceAfterAmortization,
    annualRatePct,
    monthsAfterAmortization,
    paymentAfterAmortization,
  );

  const totalBaselineInterest = baselineInterest;
  return {
    balanceAtAmortization,
    baseline: {
      monthlyPayment: originalMonthlyPayment,
      totalInterest: totalBaselineInterest,
      totalPaid: principal + totalBaselineInterest,
      principalPct:
        principal + totalBaselineInterest > 0
          ? (principal / (principal + totalBaselineInterest)) * 100
          : 0,
      interestPct:
        principal + totalBaselineInterest > 0
          ? (totalBaselineInterest / (principal + totalBaselineInterest)) * 100
          : 0,
      monthsToPayoff: monthCount,
    },
    term: makeAmortizationScenario(
      principal,
      interestBeforeAmortization + termLoan.interest,
      termMonthlyPayment,
      elapsedMonths + termLoan.months,
      totalBaselineInterest,
    ),
    payment: makeAmortizationScenario(
      principal,
      interestBeforeAmortization + paymentLoan.interest,
      paymentAfterAmortization,
      elapsedMonths + paymentLoan.months,
      totalBaselineInterest,
    ),
  };
}

export type BonusComparisonInput = {
  principal: number;
  years: number;
  baseRatePct: number;
  bonusedRatePct: number;
  fixedExpensesMonthly: number;
  bankProductsMonthly: number;
  externalProductsMonthly: number;
};

export type BonusOption = {
  monthlyPayment: number;
  monthlyTotal: number;
  annualTotal: number;
  principal: number;
  interest: number;
  expenses: number;
  totalPaid: number;
};

export type BonusComparison = {
  unbonused: BonusOption;
  bonused: BonusOption;
  totalSaving: number;
  monthlySaving: number;
};

function bonusOption(
  principal: number,
  annualRatePct: number,
  years: number,
  expensesMonthly: number,
): BonusOption {
  const summary = summarize(principal, annualRatePct, years);
  const expenses = expensesMonthly * summary.months.length;
  const monthlyTotal = summary.monthlyPayment + expensesMonthly;
  return {
    monthlyPayment: summary.monthlyPayment,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    principal,
    interest: summary.totalInterest,
    expenses,
    totalPaid: summary.totalPaid + expenses,
  };
}

export function compareBonusedProducts({
  principal,
  years,
  baseRatePct,
  bonusedRatePct,
  fixedExpensesMonthly,
  bankProductsMonthly,
  externalProductsMonthly,
}: BonusComparisonInput): BonusComparison {
  const unbonused = bonusOption(
    principal,
    baseRatePct,
    years,
    fixedExpensesMonthly + externalProductsMonthly,
  );
  const bonused = bonusOption(
    principal,
    bonusedRatePct,
    years,
    fixedExpensesMonthly + bankProductsMonthly,
  );
  return {
    unbonused,
    bonused,
    totalSaving: unbonused.totalPaid - bonused.totalPaid,
    monthlySaving: unbonused.monthlyTotal - bonused.monthlyTotal,
  };
}
