import { describe, expect, it } from 'vitest';
import {
  eur,
  numberWithGrouping,
  numberWithoutGrouping,
  parseLocalizedNumber,
  pct,
} from '../src/format';

const norm = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

describe('format', () => {
  it('formatea euros en es-ES', () => {
    expect(norm(eur.format(632.406))).toBe('632,41 €');
    expect(norm(eur.format(3131.7))).toBe('3.131,70 €');
    expect(norm(eur.format(150000))).toBe('150.000,00 €');
  });

  it('formatea porcentajes con un decimal', () => {
    expect(norm(pct.format(34.114))).toBe('34,1 %');
  });

  it('agrupa importes con la convención española y permite editarlos sin agrupación', () => {
    expect(numberWithGrouping.format(150000)).toBe('150.000');
    expect(numberWithGrouping.format(3131)).toBe('3.131');
    expect(numberWithGrouping.format(1234567.89)).toBe('1.234.567,89');
    expect(numberWithoutGrouping.format(1234567.89)).toBe('1234567,89');
  });

  it('interpreta importes españoles agrupados o en edición', () => {
    expect(parseLocalizedNumber('1.234.567,89')).toBe(1234567.89);
    expect(parseLocalizedNumber('150.000')).toBe(150000);
    expect(parseLocalizedNumber('150000,50')).toBe(150000.5);
    expect(parseLocalizedNumber('150000.5')).toBe(150000.5);
    expect(Number.isNaN(parseLocalizedNumber(''))).toBe(true);
  });
});
