import { beforeEach, describe, expect, it, vi } from 'vitest';
import { questions } from '../src/questions';

const { destroyChartsMock, renderChartMock } = vi.hoisted(() => ({
  destroyChartsMock: vi.fn(),
  renderChartMock: vi.fn(),
}));

vi.mock('../src/ui/chart', () => ({
  destroyCharts: destroyChartsMock,
  renderChart: renderChartMock,
}));

function waitForHashChange(): Promise<void> {
  return new Promise((resolve) =>
    window.addEventListener('hashchange', () => resolve(), { once: true }),
  );
}

describe('navegación por secciones', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, '', '/');
    destroyChartsMock.mockClear();
    renderChartMock.mockClear();
  });

  it('monta todas las secciones, navega desde el índice y sincroniza el scroll y el historial', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    await import('../src/main');

    const sections = document.querySelectorAll<HTMLElement>('[data-question-section]');
    expect(sections).toHaveLength(questions.length);
    for (const [index, question] of questions.entries()) {
      expect(sections[index].querySelector('h2')?.textContent).toBe(question.title);
      expect(sections[index].querySelectorAll('h2')).toHaveLength(1);
    }
    expect(window.location.hash).toBe(`#/${questions[0].id}`);

    const investmentId = 'invertir';
    document.querySelector<HTMLButtonElement>(`[data-id="${investmentId}"]`)?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.location.hash).toBe(`#/${investmentId}`);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    const activeId = 'composicion';
    for (const section of sections) {
      const active = section.id === activeId;
      vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({
        top: active ? 0 : 1000,
        bottom: active ? 800 : 1500,
      } as DOMRect);
    }
    window.dispatchEvent(new Event('scroll'));
    expect(window.location.hash).toBe(`#/${activeId}`);
    expect(document.querySelector(`[data-id="${activeId}"]`)?.getAttribute('aria-current')).toBe(
      'location',
    );

    document.querySelector<HTMLButtonElement>('[data-id="amortizacion"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const backNavigation = waitForHashChange();
    window.history.back();
    await backNavigation;

    expect(window.location.hash).toBe(`#/${activeId}`);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
