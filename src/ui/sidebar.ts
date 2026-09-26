import type { Question } from '../questions/types';

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Elemento no encontrado');
  return value;
}

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
  const buttons = nav.querySelectorAll<HTMLButtonElement>('button');
  for (const button of buttons) {
    button.addEventListener('click', () => onSelect(must(button.dataset.id)));
  }
}
