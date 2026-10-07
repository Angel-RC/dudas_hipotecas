import { describe, expect, it, vi } from 'vitest';
import type { Question } from '../src/questions/types';
import { getRoute, navigate, replaceRoute } from '../src/router';
import { renderLayout } from '../src/ui/layout';
import {
  activeSectionId,
  renderQuestionSections,
  repaintQuestionSections,
} from '../src/ui/sections';
import { renderSidebar, setActiveSidebarItem } from '../src/ui/sidebar';

const question = (id: string, title: string): Question => ({
  id,
  title,
  summary: '',
  render(container) {
    container.textContent = `Resultado ${title}`;
  },
});

describe('layout', () => {
  it('crea sidebar, panel común y contenido', () => {
    const root = document.createElement('div');
    const { sidebar, common, content } = renderLayout(root);
    expect(sidebar).toBeTruthy();
    expect(common).toBeTruthy();
    expect(content).toBeTruthy();
    expect(root.querySelector('[data-layout-shell]')?.className).toContain('max-w-screen-2xl');
    expect(root.querySelector('[data-layout-shell]')?.className).toContain(
      'md:grid-cols-[220px_minmax(0,1fr)]',
    );
    expect(common.className).not.toContain('border');
  });
});

describe('sidebar', () => {
  it('lista las preguntas y notifica la selección', () => {
    const nav = document.createElement('nav');
    const selected: string[] = [];
    renderSidebar(nav, [question('a', 'A'), question('b', 'B')], 'a', (id) => selected.push(id));
    const buttons = nav.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain('A');
    buttons[1].click();
    expect(selected).toEqual(['b']);
  });

  it('actualiza el índice según la sección que queda activa', () => {
    const nav = document.createElement('nav');
    renderSidebar(nav, [question('a', 'A'), question('b', 'B')], 'a', () => {});

    setActiveSidebarItem(nav, 'b');

    expect(nav.querySelector('[data-id="a"]')?.getAttribute('aria-current')).toBeNull();
    expect(nav.querySelector('[data-id="b"]')?.getAttribute('aria-current')).toBe('location');
  });
});

describe('secciones de preguntas', () => {
  it('monta todas las preguntas como secciones y las actualiza sin reemplazar los contenedores', () => {
    const root = document.createElement('div');
    const items = [question('a', 'A'), question('b', 'B')];
    const sections = renderQuestionSections(root, items, { store: undefined as never });
    const firstSection = sections[0].element;

    expect(root.querySelectorAll('section[data-question-section]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-question-separator]')).toHaveLength(1);
    expect(root.querySelector('#a')).toBeTruthy();
    expect(root.querySelector('#b')).toBeTruthy();
    expect(root.querySelector('#a h2')?.textContent).toBe('A');
    expect(root.querySelector('#b h2')?.textContent).toBe('B');
    expect(root.querySelector('#a [data-question-content]')?.textContent).toBe('Resultado A');
    expect(root.querySelector('#b [data-question-content]')?.textContent).toBe('Resultado B');

    repaintQuestionSections(sections, { store: undefined as never });

    expect(root.querySelector('#a')).toBe(firstSection);
  });

  it('elige la sección que contiene el punto de referencia del viewport', () => {
    const first = document.createElement('section');
    const second = document.createElement('section');
    first.id = 'first';
    second.id = 'second';
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({ top: -500, bottom: -10 } as DOMRect);
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 700 } as DOMRect);

    expect(activeSectionId([first, second], 350)).toBe('second');
  });
});

describe('router', () => {
  it('lee y escribe el hash', () => {
    navigate('tae');
    expect(getRoute()).toBe('tae');

    replaceRoute('composicion');
    expect(getRoute()).toBe('composicion');
  });
});
