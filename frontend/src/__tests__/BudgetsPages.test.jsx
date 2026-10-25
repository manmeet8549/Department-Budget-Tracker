import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import BudgetsPage from '../features/budgets/BudgetsPage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatINR } from '../utils/currency.js';
import * as authContext from '../features/auth/AuthContext.jsx';
import * as budgetsApi from '../api/budgets.js';
import * as masterApi from '../api/master.js';

describe('Budgets Module Frontend (Iteration 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Currency Formatter (formatINR)', () => {
    it('formats numbers with Indian grouping and rupee symbol', () => {
      expect(formatINR(150000.5)).toBe('₹ 1,50,000.50');
      expect(formatINR(800000)).toBe('₹ 8,00,000');
      expect(formatINR(10000000)).toBe('₹ 1,00,00,000');
      expect(formatINR(0)).toBe('₹ 0');
    });

    it('formats without symbol when showSymbol is false', () => {
      expect(formatINR(150000.5, { showSymbol: false })).toBe('1,50,000.50');
      expect(formatINR(800000, { showSymbol: false })).toBe('8,00,000');
    });

    it('handles null, undefined, or empty values gracefully', () => {
      expect(formatINR(null)).toBe('—');
      expect(formatINR(undefined)).toBe('—');
      expect(formatINR('')).toBe('—');
    });
  });

  describe('BudgetsPage Component', () => {
    const mockBudgets = [
      {
        id: 1,
        financialYearId: 1,
        financialYear: { id: 1, year: '2026-27', isActive: true },
        departmentId: 10,
        department: { id: 10, code: 'ET', name: 'Electronics and Telecommunication' },
        totalAmount: 200000,
        status: 'DRAFT',
        approvedBy: null,
        approvedOn: null,
        items: [
          { id: 101, categoryId: 1, amount: 120000, category: { name: 'Equipment' } },
          { id: 102, categoryId: 2, amount: 80000, category: { name: 'Software' } },
        ],
      },
      {
        id: 2,
        financialYearId: 1,
        financialYear: { id: 1, year: '2026-27', isActive: true },
        departmentId: 20,
        department: { id: 20, code: 'PHARMA', name: 'Pharmacy' },
        totalAmount: 500000,
        status: 'APPROVED',
        approvedBy: 5,
        approvedOn: '2026-05-10T10:00:00.000Z',
        approver: { id: 5, name: 'Dr. Management User', email: 'management@college.edu' },
        items: [
          { id: 201, categoryId: 3, amount: 300000, category: { name: 'Consumables' } },
          { id: 202, categoryId: 1, amount: 200000, category: { name: 'Equipment' } },
        ],
      },
    ];

    const mockCategories = [
      { id: 1, name: 'Equipment', isActive: true },
      { id: 2, name: 'Software', isActive: true },
      { id: 3, name: 'Consumables', isActive: true },
    ];

    const mockDepartments = [
      { id: 10, code: 'ET', name: 'Electronics and Telecommunication' },
      { id: 20, code: 'PHARMA', name: 'Pharmacy' },
    ];

    const mockActiveFy = { id: 1, year: '2026-27', isActive: true, status: 'OPEN' };

    beforeEach(() => {
      vi.spyOn(budgetsApi, 'getBudgets').mockResolvedValue(mockBudgets);
      vi.spyOn(masterApi, 'getActiveFinancialYear').mockResolvedValue(mockActiveFy);
      vi.spyOn(masterApi, 'getFinancialYears').mockResolvedValue([mockActiveFy]);
      vi.spyOn(masterApi, 'getDepartments').mockResolvedValue(mockDepartments);
      vi.spyOn(masterApi, 'getCategories').mockResolvedValue(mockCategories);
    });

    it('renders the budgets table with Indian formatted amounts and status badges', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 1, role: 'SUPER_ADMIN' },
      });

      render(<BudgetsPage />);

      expect(screen.getByText('Annual Department Budgets')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('ET')).toBeInTheDocument();
        expect(screen.getByText('PHARMA')).toBeInTheDocument();
        expect(screen.getByText('₹ 2,00,000')).toBeInTheDocument();
        expect(screen.getByText('₹ 5,00,000')).toBeInTheDocument();
        expect(screen.getAllByText('DRAFT').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('APPROVED').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays Approve button for MANAGEMENT on DRAFT budgets and executes approveBudget', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 2, role: 'MANAGEMENT' },
      });
      const approveSpy = vi.spyOn(budgetsApi, 'approveBudget').mockResolvedValue({
        ...mockBudgets[0],
        status: 'APPROVED',
      });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<BudgetsPage />);

      await waitFor(() => {
        const approveBtn = screen.getByRole('button', { name: /^Approve$/i });
        expect(approveBtn).toBeInTheDocument();
        fireEvent.click(approveBtn);
      });

      expect(approveSpy).toHaveBeenCalledWith(1);
    });

    it('does not display Approve button for HOD', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 3, role: 'HOD', departmentId: 10 },
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByText('ET')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
    });

    it('opens read-only modal for approved budget and shows frozen message', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 3, role: 'HOD', departmentId: 10 },
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        const viewBtns = screen.getAllByRole('button', { name: /^View$/i });
        fireEvent.click(viewBtns[1]); // View second (PHARMA - APPROVED)
      });

      await waitFor(() => {
        expect(screen.getByText(/This budget is approved and frozen/i)).toBeInTheDocument();
        expect(screen.getByText('Dr. Management User')).toBeInTheDocument();
      });
    });
  });

  describe('StatusBadge Component (design.md Option A)', () => {
    it('always renders with a text label and indicator dot (never color alone)', () => {
      render(<StatusBadge status="APPROVED" />);
      expect(screen.getByText('APPROVED')).toBeInTheDocument();

      const badge = screen.getByText('APPROVED').closest('.dp-status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('dp-status-approved');
    });

    it('supports custom label and size="sm"', () => {
      render(<StatusBadge status="DRAFT" label="Draft In Review" size="sm" />);
      expect(screen.getByText('Draft In Review')).toBeInTheDocument();
    });
  });
});
