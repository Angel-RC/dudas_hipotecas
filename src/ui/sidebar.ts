import type { Question } from '../questions/types';

const BUTTON_BASE_CLASS =
  'rounded-full px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

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
        ${q.id === activeId ? 'aria-current="location"' : ''}
        class="${BUTTON_BASE_CLASS} ${activeButtonClass(q.id === activeId)}">
        ${q.title}
      </button>`,
    )
    .join('');
  const buttons = nav.querySelectorAll<HTMLButtonElement>('button');
  for (const button of buttons) {
    button.addEventListener('click', () => onSelect(must(button.dataset.id)));
  }
}

function activeButtonClass(active: boolean): string {
  return active
    ? 'bg-accent font-semibold text-white shadow-sm'
    : 'text-muted hover:bg-white hover:text-accent';
}

export function setActiveSidebarItem(nav: HTMLElement, activeId: string): void {
  const buttons = nav.querySelectorAll<HTMLButtonElement>('[data-id]');
  for (const button of buttons) {
    const active = button.dataset.id === activeId;
    button.className = `${BUTTON_BASE_CLASS} ${activeButtonClass(active)}`;
    if (active) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  }
}
