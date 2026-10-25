/**
 * currency.js
 * Indian rupee formatting helper per design.md and techstack.md.
 * e.g. 150000.50 -> "₹ 1,50,000.50"
 */

export function formatINR(amount, { showSymbol = true } = {}) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  const hasFraction = num % 1 !== 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);

  return showSymbol ? `₹ ${formatted}` : formatted;
}
