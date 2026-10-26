const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats any ISO date string, Date instance, or timestamp into "1 Apr 2026" format.
 * Returns "—" for falsy or invalid dates.
 *
 * @param {string|Date|number|null|undefined} input
 * @returns {string}
 */
export function formatDate(input) {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';

  // Handle YYYY-MM-DD cleanly without timezone offset shift
  const isDateOnly = typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim());
  const day = isDateOnly ? d.getUTCDate() : d.getDate();
  const month = MONTHS[isDateOnly ? d.getUTCMonth() : d.getMonth()];
  const year = isDateOnly ? d.getUTCFullYear() : d.getFullYear();

  return `${day} ${month} ${year}`;
}

export default formatDate;
