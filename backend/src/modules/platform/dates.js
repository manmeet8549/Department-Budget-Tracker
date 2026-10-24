/**
 * platform/dates.js
 * Date helpers — Asia/Kolkata timezone, DD-MM-YYYY format.
 * Rule: all dates formatted as DD-MM-YYYY, all timestamps in IST.
 */

const IST = 'Asia/Kolkata';

/**
 * Format a Date (or ISO string) as DD-MM-YYYY in IST.
 * @param {Date|string} date
 * @returns {string} e.g. "25-10-2026"
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')}`;
}

/**
 * Current date/time as a Date object (IST-aware but Date is always UTC internally).
 * @returns {Date}
 */
export function nowIST() {
  return new Date();
}
