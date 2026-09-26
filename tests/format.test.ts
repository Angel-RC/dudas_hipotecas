import { describe, it, expect } from 'vitest';
import { eur, pct } from '../src/format';

const norm = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

describe('format', () => {
  it('formatea euros en es-ES', () => {
    expect(norm(eur.format(632.406))).toBe('632,41 €');
    expect(norm(eur.format(150000))).toBe('150.000,00 €');
  });

  it('formatea porcentajes con un decimal', () => {
    expect(norm(pct.format(34.114))).toBe('34,1 %');
  });
});
