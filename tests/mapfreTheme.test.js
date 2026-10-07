import { describe, expect, it } from 'vitest';
import tailwindConfig from '../tailwind.config.js';

function luminance(hex) {
  const rgb = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('tema visual compatible con MAPFRE', () => {
  it('define la paleta y tipografía corporativas de referencia', () => {
    const { colors, fontFamily } = tailwindConfig.theme.extend;

    expect(colors.accent).toBe('#DF0027');
    expect(colors.ink).toBe('#2D373D');
    expect(colors.muted).toBe('#526570');
    expect(colors.balance).toBe('#77868D');
    expect(fontFamily.sans[0]).toBe('DM Sans');
    expect(contrastRatio(colors.balance, '#FFFFFF')).toBeGreaterThanOrEqual(3);
  });
});
