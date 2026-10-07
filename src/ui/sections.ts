import type { Question, QuestionContext } from '../questions/types';
import { destroyCharts } from './chart';

export type QuestionSection = {
  question: Question;
  element: HTMLElement;
  content: HTMLElement;
};

export function renderQuestionSections(
  container: HTMLElement,
  questions: Question[],
  context: QuestionContext,
): QuestionSection[] {
  container.innerHTML = '';
  return questions.map((question, index) => {
    const element = document.createElement('section');
    element.id = question.id;
    element.dataset.questionSection = question.id;
    element.className = 'scroll-mt-8 py-10 first:pt-0';

    const heading = document.createElement('h2');
    heading.className = 'mb-6 text-3xl font-semibold tracking-tight';
    heading.textContent = question.title;
    const content = document.createElement('div');
    content.dataset.questionContent = '';
    element.append(heading, content);
    question.render(content, context);
    container.append(element);

    if (index < questions.length - 1) {
      const separator = document.createElement('hr');
      separator.dataset.questionSeparator = '';
      separator.setAttribute('aria-hidden', 'true');
      separator.className = 'my-6 border-0 border-t border-line';
      container.append(separator);
    }

    return { question, element, content };
  });
}

export function repaintQuestionSections(
  sections: QuestionSection[],
  context: QuestionContext,
): void {
  for (const { question, element, content } of sections) {
    destroyCharts(element);
    question.render(content, context);
  }
}

export function activeSectionId(sections: HTMLElement[], anchorY: number): string | undefined {
  if (sections.length === 0) return undefined;

  let nearest = sections[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const section of sections) {
    const { top, bottom } = section.getBoundingClientRect();
    if (top <= anchorY && bottom > anchorY) return section.id;

    const distance = top > anchorY ? top - anchorY : anchorY - bottom;
    if (distance < nearestDistance) {
      nearest = section;
      nearestDistance = distance;
    }
  }
  return nearest.id;
}
