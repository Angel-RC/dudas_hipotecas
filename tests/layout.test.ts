import { describe, expect, it } from 'vitest';
import type { Question } from '../src/questions/types';
import { getRoute, navigate } from '../src/router';
import { renderLayout } from '../src/ui/layout';
import { renderSidebar } from '../src/ui/sidebar';

const question = (id: string, title: string): Question => ({
  id,
  title,
  summary: '',
  render() {},
});

describe('layout', () => {
  it('crea sidebar, panel común y contenido', () => {
    const root = document.createElement('div');
    const { sidebar, common, content } = renderLayout(root);
    expect(sidebar).toBeTruthy();
    expect(common).toBeTruthy();
    expect(content).toBeTruthy();
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
});

describe('router', () => {
  it('lee y escribe el hash', () => {
    navigate('tae');
    expect(getRoute()).toBe('tae');
  });
});
