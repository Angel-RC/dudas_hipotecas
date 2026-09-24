# Simulador de hipotecas (sistema francés) — Diseño

Fecha: 2026-09-24
Estado: aprobado el diseño en conversación; pendiente de revisión del spec escrito.

## Objetivo

Página HTML de uso personal para simular hipotecas a interés fijo con el sistema
francés. Debe permitir entender de forma visual cómo afectan el importe, el plazo
y el tipo de interés a la cuota y al coste total.

## Alcance

Dentro:
- Entradas: importe a financiar (€), número de años, interés TIN anual (%).
- Cálculo de la cuota mensual constante y del cuadro de amortización.
- Tabla anual: cuota anual, intereses del año, principal amortizado, capital
  pendiente y acumulados (intereses y principal).
- Gráficas: composición anual (principal vs intereses + capital pendiente) y
  sensibilidad de la cuota frente al plazo para el tipo introducido.
- Panel explicativo de la ecuación del sistema francés con sustitución de valores.

Fuera (YAGNI):
- Comisiones de apertura, seguros, IVA, TAE, tipo variable.
- Comparación de múltiples escenarios guardados.
- Backend, build, dependencias externas, tests automatizados.
- Multi-idioma y multi-moneda (solo español, EUR, formato es-ES).

## Decisiones

- **Un único archivo `index.html`** con HTML, CSS y JS vanilla embebidos. Sin
  build, sin dependencias, sin CDN. Se abre con doble clic y funciona offline.
- Gráficas dibujadas a mano con SVG (sin librerías).
- Recalcula en vivo al cambiar las entradas, con debounce (~150 ms).
- Ubicación: raíz del proyecto (`/home/chicote/Work/hipotecas/index.html`).

## Modelo financiero

- Tipo mensual `i = TIN / 100 / 12`.
- Número de cuotas `n = años * 12`.
- Cuota mensual (sistema francés):

  `C = P · i / (1 − (1 + i)^(−n))`

  Caso particular `i = 0`: `C = P / n`.

- Amortización mes a mes en precisión completa:
  - `interes_mes = capital_pendiente · i`
  - `principal_mes = C − interes_mes`
  - `capital_pendiente −= principal_mes`
- Se agrega por años para la tabla. En el último año se ajusta el residual para
  que el capital pendiente cierre exactamente en 0.
- Se muestra con 2 decimales (formato es-ES, separador de miles `.` y decimal `,`).

## Interfaz

1. **Panel de entradas**: tres campos numéricos + etiquetas con unidad.
2. **Tarjetas resumen**: cuota mensual, total intereses, total pagado, % intereses.
3. **Panel de la ecuación**: fórmula con fracción renderizada en HTML/CSS (sin
   librerías), leyenda de cada término (`C`, `P`, `i`, `n`) y sustitución con los
   valores actuales. Texto breve explicando el compromiso plazo/interés.
4. **Tabla anual** con las columnas indicadas.
5. **Gráfica 1 — composición anual**: barras apiladas (principal abajo, intereses
   arriba) por año, más línea de capital pendiente.
6. **Gráfica 2 — sensibilidad al plazo**: una sola curva de cuota mensual frente
   al plazo (años) usando el único tipo de interés introducido por el usuario,
   marcando el punto correspondiente al plazo actual.

## Validación

- `importe > 0`.
- `años` entre 1 y 50.
- `interés` entre 0 y 20.
- Mensajes de error inline junto al campo. No se renderiza tabla/gráficas
  mientras haya entradas inválidas.

## Verificación

Sin framework de tests (archivo personal). Se verifica abriendo `index.html` y
contrastando valores de referencia conocidos, por ejemplo:
- P = 150.000 €, 30 años, 3% → cuota ≈ 632,41 €/mes.
- P = 150.000 €, 30 años, 3% → intereses totales ≈ 77.666 €.

Se comprobarán además: caso `i = 0`, último año cierra en 0, y que la suma de
principal amortizado iguala el importe financiado.
