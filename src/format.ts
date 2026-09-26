export const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export const pct = new Intl.NumberFormat('es-ES', {
  style: 'unit',
  unit: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
