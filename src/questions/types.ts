import type { Store } from '../state';

export type QuestionContext = { store: Store };

export type Question = {
  id: string;
  title: string;
  summary: string;
  render: (container: HTMLElement, context: QuestionContext) => void;
};
