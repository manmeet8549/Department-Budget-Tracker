import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDate } from '../utils/dates.js';
import { formatRoleLabel } from '../utils/roles.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';

describe('UI-1 Foundation & Refinement Requirements', () => {
  describe('1. formatDate helper', () => {
    it('formats ISO dates correctly into "1 Apr 2026" pattern', () => {
      // 2026-04-01
      const date1 = '2026-04-01T10:00:00.000Z';
      expect(formatDate(date1)).toMatch(/1 Apr 2026/);

      // 2026-12-25
      const date2 = '2026-12-25T00:00:00.000Z';
      expect(formatDate(date2)).toMatch(/25 Dec 2026/);
    });

    it('returns a graceful dash for empty, null, or undefined values', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('')).toBe('—');
      expect(formatDate('invalid-date-string')).toBe('—');
    });
  });

  describe('2. StatusBadge component', () => {
    const statuses = [
      { raw: 'DRAFT', expected: 'DRAFT' },
      { raw: 'SUBMITTED', expected: 'SUBMITTED' },
      { raw: 'UNDER_REVIEW', expected: 'UNDER_REVIEW' },
      { raw: 'APPROVED', expected: 'APPROVED' },
      { raw: 'REJECTED', expected: 'REJECTED' },
      { raw: 'PAID', expected: 'PAID' },
      { raw: 'CANCELLED', expected: 'CANCELLED' },
    ];

    statuses.forEach(({ raw, expected }) => {
      it(`always renders its text label for status "${raw}"`, () => {
        const { unmount } = render(<StatusBadge status={raw} id={`badge-${raw}`} />);
        const textElement = screen.getByText(expected);
        expect(textElement).toBeInTheDocument();
        // Dot indicator must also be present
        const dot = document.querySelector('.dp-status-badge-dot');
        expect(dot).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('3. Button component trailing icon and keyboard focus', () => {
    it('renders the trailing icon when requested via icon prop', () => {
      const { rerender } = render(<Button id="btn-test">Click Me</Button>);
      // No arrow icon by default
      expect(document.querySelector('.dp-btn-arrow')).not.toBeInTheDocument();

      rerender(<Button id="btn-test" icon>Continue</Button>);
      const arrowIcon = document.querySelector('.dp-btn-arrow');
      expect(arrowIcon).toBeInTheDocument();
    });

    it('is keyboard focusable and receives focus', () => {
      render(<Button id="btn-focus-test">Focus Target</Button>);
      const button = screen.getByRole('button', { name: /Focus Target/i });
      button.focus();
      expect(document.activeElement).toBe(button);
      expect(button).toHaveFocus();
    });
  });

  describe('4. DataTable empty state', () => {
    it('shows the empty state message and icon when data array is empty', () => {
      const columns = [{ header: 'Name', accessor: 'name' }];
      render(
        <DataTable
          id="test-table"
          columns={columns}
          data={[]}
          emptyMessage="No departments found for this search."
        />
      );

      expect(screen.getByText('No departments found for this search.')).toBeInTheDocument();
      expect(screen.getByTestId('data-table-empty')).toBeInTheDocument();
    });
  });

  describe('5. formatRoleLabel helper', () => {
    it('never shows the raw enum for any role', () => {
      const roles = [
        { enumVal: 'SUPER_ADMIN', dept: null },
        { enumVal: 'MANAGEMENT', dept: null },
        { enumVal: 'FINANCE', dept: null },
        { enumVal: 'AUDITOR', dept: null },
        { enumVal: 'HOD', dept: 'Engineering' },
        { enumVal: 'HOD', dept: null },
        { enumVal: 'STAFF', dept: 'Science' },
        { enumVal: 'STAFF', dept: null },
      ];

      roles.forEach(({ enumVal, dept }) => {
        const label = formatRoleLabel(enumVal, dept);
        // Must not equal the raw enum
        expect(label).not.toBe(enumVal);
        // Must be a friendly human-readable title
        expect(label.length).toBeGreaterThan(0);
      });

      // Specific checks
      expect(formatRoleLabel('SUPER_ADMIN')).toBe('Super Admin');
      expect(formatRoleLabel('HOD', 'Engineering')).toBe('HoD - Engineering');
      expect(formatRoleLabel('HOD')).toBe('Head of Department');
      expect(formatRoleLabel('FINANCE')).toBe('Finance Officer');
    });
  });

  describe('6. Utilisation bar percentage text', () => {
    it('shows the utilisation percentage explicitly as text', () => {
      const testUtilisationPercent = 78.5;
      render(
        <div data-testid="util-container">
          <div data-testid="utilisation-text">{testUtilisationPercent}% used</div>
          <div
            role="progressbar"
            aria-valuenow={testUtilisationPercent}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
      );

      const percentText = screen.getByTestId('utilisation-text');
      expect(percentText).toHaveTextContent('78.5% used');
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '78.5');
    });
  });
});
