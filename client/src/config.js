// Hardcoded client-side defaults.
export const config = {
  // Calculator window starts open when the desktop loads.
  calculatorOpenByDefault: true,
};

// Challenge types that start DESELECTED in the lobby. The host can still
// click them back on before starting; they're just off by default.
// Keys must match server challenge `type` values.
export const disabledByDefault = new Set([
  'xor',
]);
