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
