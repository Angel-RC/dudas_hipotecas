import { compositionQuestion } from './composition';
import { monthlyPaymentQuestion } from './monthlyPayment';
import type { Question } from './types';

export const questions: Question[] = [monthlyPaymentQuestion, compositionQuestion];
