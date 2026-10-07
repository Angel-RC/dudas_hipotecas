export const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
  useGrouping: true,
});

export const pct = new Intl.NumberFormat('es-ES', {
  style: 'unit',
  unit: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const numberWithGrouping = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
  useGrouping: true,
});

export const numberWithoutGrouping = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function parseLocalizedNumber(value: string): number {
  const normalized = value.trim().replace(/[\s\u00a0\u202f]/g, '');
  if (!normalized) return Number.NaN;

  if (normalized.includes(',')) {
    if ((normalized.match(/,/g)?.length ?? 0) > 1) return Number.NaN;
    return Number(normalized.replace(/\./g, '').replace(',', '.'));
  }

  if (/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    return Number(normalized.replace(/\./g, ''));
  }

  return Number(normalized);
}
