import { amortizationQuestion } from './amortization';
import { bonusQuestion } from './bonus';
import { compositionQuestion } from './composition';
import { investmentQuestion } from './investment';
import { monthlyPaymentQuestion } from './monthlyPayment';
import type { Question } from './types';

export const questions: Question[] = [
  monthlyPaymentQuestion,
  compositionQuestion,
  amortizationQuestion,
  bonusQuestion,
  investmentQuestion,
];
