/**
 * Formats a raw role enum (and optional department) into a human-friendly label.
 * Never outputs the raw uppercase/underscore enum string.
 * Examples:
 *   formatRoleLabel('SUPER_ADMIN') -> 'Super Admin'
 *   formatRoleLabel('MANAGEMENT') -> 'Management'
 *   formatRoleLabel('FINANCE') -> 'Finance Officer'
 *   formatRoleLabel('AUDITOR') -> 'Auditor'
 *   formatRoleLabel('HOD', { code: 'ET', name: 'Engineering Block' }) -> 'HoD - Engineering'
 *   formatRoleLabel('STAFF', { code: 'ET' }) -> 'Staff - ET'
 *
 * @param {string|null|undefined} role
 * @param {{ code?: string, name?: string }|null} [department]
 * @returns {string}
 */
export function formatRoleLabel(role, department = null) {
  if (!role) return 'User';

  const cleanRole = String(role).toUpperCase().trim();

  let deptLabel = '';
  if (typeof department === 'string') {
    deptLabel = department.replace(/ Block$/i, '');
  } else if (department && typeof department === 'object') {
    deptLabel = department.name
      ? department.name.replace(/ Block$/i, '')
      : department.code || '';
  }

  switch (cleanRole) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'MANAGEMENT':
      return 'Management';
    case 'FINANCE':
      return 'Finance Officer';
    case 'AUDITOR':
      return 'Auditor';
    case 'HOD':
      return deptLabel ? `HoD - ${deptLabel}` : 'Head of Department';
    case 'STAFF':
      return deptLabel ? `Staff - ${deptLabel}` : 'Staff';
    default:
      // Fallback for any other enum: title-case without underscores
      return cleanRole
        .toLowerCase()
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

export default formatRoleLabel;
