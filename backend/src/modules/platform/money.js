/**
 * platform/money.js
 * Indian rupee helpers — format amounts, convert to/from paise.
 * Rule: store money as NUMERIC(14,2) in DB.
 *       In JS, always work in integer paise to avoid floating-point drift.
 * Format: Indian grouping — 8,00,000 (not 800,000)
 */

/**
 * Format a numeric rupee amount using Indian digit grouping.
 * e.g. 800000 → "8,00,000"  |  150000.5 → "1,50,000.50"
 * @param {number|string} amount
 * @returns {string}
 */
export function formatINR(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  // Show 2 decimal places only when there is a fractional part
  const hasFraction = num % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Convert rupees (possibly decimal) to integer paise.
 * e.g. 1.50 → 150
 * @param {number} rupees
 * @returns {number} paise (integer)
 */
export function toMinorUnits(rupees) {
  return Math.round(rupees * 100);
}

/**
 * Convert paise back to rupees.
 * e.g. 150 → 1.5
 * @param {number} paise
 * @returns {number}
 */
export function fromMinorUnits(paise) {
  return paise / 100;
}
