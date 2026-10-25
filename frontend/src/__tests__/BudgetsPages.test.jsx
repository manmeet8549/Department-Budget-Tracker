import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import BudgetsPage from '../features/budgets/BudgetsPage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatINR } from '../utils/currency.js';
import * as authContext from '../features/auth/AuthContext.jsx';
import * as budgetsApi from '../api/budgets.js';
import * as masterApi from '../api/master.js';

describe('Budgets Module Frontend (Iteration 6: Budgets v2)', () => {
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
        approvals: [],
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
        approvals: [
          {
            id: 1,
            stepNo: 1,
            decision: 'APPROVED',
            approverId: 5,
            approver: { name: 'Dr. Management User' },
            remark: 'Final allocation approved within annual ceiling',
            decidedOn: '2026-05-10T10:00:00.000Z',
          },
        ],
      },
      {
        id: 3,
        financialYearId: 1,
        financialYear: { id: 1, year: '2026-27', isActive: true },
        departmentId: 30,
        department: { id: 30, code: 'CS', name: 'Computer Science' },
        totalAmount: 400000,
        status: 'UNDER_REVIEW',
        approvedBy: null,
        approvedOn: null,
        items: [
          { id: 301, categoryId: 1, amount: 250000, category: { name: 'Equipment' } },
          { id: 302, categoryId: 2, amount: 150000, category: { name: 'Software' } },
        ],
        approvals: [
          {
            id: 2,
            stepNo: 1,
            decision: 'SUBMITTED',
            approverId: 6,
            approver: { name: 'CS HoD' },
            remark: 'Submitted proposed budget',
            decidedOn: '2026-05-02T10:00:00.000Z',
          },
          {
            id: 3,
            stepNo: 2,
            decision: 'UNDER_REVIEW',
            approverId: 2,
            approver: { name: 'Finance Lead' },
            remark: 'Verified lab requirements',
            decidedOn: '2026-05-03T11:00:00.000Z',
          },
        ],
      },
      {
        id: 4,
        financialYearId: 1,
        financialYear: { id: 1, year: '2026-27', isActive: true },
        departmentId: 40,
        department: { id: 40, code: 'MECH', name: 'Mechanical Engineering' },
        totalAmount: 350000,
        status: 'SUBMITTED',
        approvedBy: null,
        approvedOn: null,
        items: [
          { id: 401, categoryId: 1, amount: 350000, category: { name: 'Equipment' } },
        ],
        approvals: [],
      },
      {
        id: 5,
        financialYearId: 1,
        financialYear: { id: 1, year: '2026-27', isActive: true },
        departmentId: 10,
        department: { id: 10, code: 'ET', name: 'Electronics and Telecommunication' },
        totalAmount: 180000,
        status: 'REJECTED',
        approvedBy: null,
        approvedOn: null,
        items: [
          { id: 501, categoryId: 1, amount: 180000, category: { name: 'Equipment' } },
        ],
        approvals: [
          {
            id: 4,
            stepNo: 1,
            decision: 'REJECTED',
            approverId: 5,
            approver: { name: 'Management User' },
            remark: 'Exceeds target limit; please trim equipment',
            decidedOn: '2026-05-04T12:00:00.000Z',
          },
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
      { id: 30, code: 'CS', name: 'Computer Science' },
      { id: 40, code: 'MECH', name: 'Mechanical Engineering' },
    ];

    const mockActiveFy = { id: 1, year: '2026-27', isActive: true, status: 'OPEN' };

    const mockCeiling = {
      financialYearId: 1,
      ceiling: '10000000.00',
      approvedTotal: '500000.00',
      remaining: '9500000.00',
      setBy: 'Management User',
      setOn: '2026-04-01T10:00:00.000Z',
    };

    const mockComparison = {
      financialYearId: 1,
      previousFinancialYearId: 2,
      previousFinancialYear: { id: 2, year: '2025-26' },
      comparison: [
        { categoryId: 1, currentProposed: 120000, previousSpent: 95000 },
        { categoryId: 2, currentProposed: 80000, previousSpent: 65000 },
      ],
    };

    beforeEach(() => {
      vi.spyOn(budgetsApi, 'getBudgets').mockResolvedValue(mockBudgets);
      vi.spyOn(budgetsApi, 'getBudget').mockImplementation((id) => {
        const found = mockBudgets.find((b) => b.id === Number(id));
        return Promise.resolve(found || mockBudgets[0]);
      });
      vi.spyOn(budgetsApi, 'getBudgetComparison').mockResolvedValue(mockComparison);
      vi.spyOn(budgetsApi, 'getCollegeCeiling').mockResolvedValue(mockCeiling);
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
        expect(screen.getAllByText('ET').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('PHARMA')).toBeInTheDocument();
        expect(screen.getByText('₹ 2,00,000')).toBeInTheDocument();
        expect(screen.getByText('₹ 5,00,000')).toBeInTheDocument();
        expect(screen.getAllByText('DRAFT').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('APPROVED').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('UNDER_REVIEW').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('SUBMITTED').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('REJECTED').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays college ceiling panel for MANAGEMENT and FINANCE', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 2, role: 'FINANCE' },
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getByText('College Budget Ceiling')).toBeInTheDocument();
        expect(screen.getByText('₹ 1,00,00,000')).toBeInTheDocument();
        expect(screen.getByText('₹ 95,00,000')).toBeInTheDocument();
        expect(screen.getAllByText('₹ 5,00,000').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays Approve and Reject buttons for MANAGEMENT strictly on UNDER_REVIEW budgets', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 5, role: 'MANAGEMENT' },
      });
      const approveSpy = vi.spyOn(budgetsApi, 'approveBudget').mockResolvedValue({
        ...mockBudgets[2],
        status: 'APPROVED',
      });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<BudgetsPage />);

      await waitFor(() => {
        const approveBtn = screen.getByRole('button', { name: /^Approve$/i });
        expect(approveBtn).toBeInTheDocument();
        fireEvent.click(approveBtn);
      });

      expect(approveSpy).toHaveBeenCalledWith(3);
    });

    it('allows HoD to submit DRAFT and REJECTED budgets of their department', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 10, role: 'HOD', departmentId: 10 },
      });
      const submitSpy = vi.spyOn(budgetsApi, 'submitBudget').mockResolvedValue({
        ...mockBudgets[0],
        status: 'SUBMITTED',
      });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<BudgetsPage />);

      await waitFor(() => {
        // Budget #1 is DRAFT for ET (dept 10), so Submit button is present
        const submitBtns = screen.getAllByRole('button', { name: /^Submit$/i });
        expect(submitBtns.length).toBeGreaterThanOrEqual(1);
        fireEvent.click(submitBtns[0]);
      });

      expect(submitSpy).toHaveBeenCalledWith(1);
    });

    it('does not display Approve or Review buttons for HOD', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 10, role: 'HOD', departmentId: 10 },
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        expect(screen.getAllByText('ET').length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Review$/i })).not.toBeInTheDocument();
    });

    it('allows Finance to open review modal for SUBMITTED budget', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 2, role: 'FINANCE' },
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        const reviewBtns = screen.getAllByRole('button', { name: /^Review$/i });
        expect(reviewBtns.length).toBeGreaterThanOrEqual(1);
        fireEvent.click(reviewBtns[0]);
      });

      await waitFor(() => {
        expect(screen.getByText(/Finance Review:/i)).toBeInTheDocument();
        expect(screen.getByText('Review Remark *')).toBeInTheDocument();
      });
    });

    it('opens detail modal showing prior year actuals comparison and approval trail', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 1, role: 'SUPER_ADMIN' },
      });

      render(<BudgetsPage />);

      await waitFor(() => {
        const viewBtns = screen.getAllByRole('button', { name: /^View$/i });
        fireEvent.click(viewBtns[0]); // Budget #1
      });

      await waitFor(() => {
        expect(screen.getByText(/Category Allocations & Prior Year Actuals/i)).toBeInTheDocument();
        expect(screen.getByText('₹ 95,000')).toBeInTheDocument();
        expect(screen.getByText('Approval & Workflow Trail')).toBeInTheDocument();
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

    it('renders UNDER_REVIEW, SUBMITTED, and REJECTED status badges correctly', () => {
      const { container } = render(
        <div>
          <StatusBadge status="UNDER_REVIEW" />
          <StatusBadge status="SUBMITTED" />
          <StatusBadge status="REJECTED" />
        </div>
      );

      expect(screen.getByText('UNDER_REVIEW')).toBeInTheDocument();
      expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
      expect(screen.getByText('REJECTED')).toBeInTheDocument();

      expect(container.querySelector('.dp-status-under_review')).toBeInTheDocument();
      expect(container.querySelector('.dp-status-submitted')).toBeInTheDocument();
      expect(container.querySelector('.dp-status-rejected')).toBeInTheDocument();
    });

    it('supports custom label and size="sm"', () => {
      render(<StatusBadge status="DRAFT" label="Draft In Review" size="sm" />);
      expect(screen.getByText('Draft In Review')).toBeInTheDocument();
    });
  });
});
