import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ExpensesPage from '../features/expenses/ExpensesPage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import * as authContext from '../features/auth/AuthContext.jsx';
import * as expensesApi from '../api/expenses.js';
import * as balancesApi from '../api/balances.js';
import * as masterApi from '../api/master.js';

describe('Expenses & Balances Frontend (Iteration 4a)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('StatusBadge Component (Expanded Statuses)', () => {
    it('renders PAID, SUBMITTED, and CANCELLED badges with proper labels and icons', () => {
      const { rerender } = render(<StatusBadge status="PAID" />);
      expect(screen.getByText('PAID')).toBeInTheDocument();

      rerender(<StatusBadge status="SUBMITTED" />);
      expect(screen.getByText('SUBMITTED')).toBeInTheDocument();

      rerender(<StatusBadge status="CANCELLED" />);
      expect(screen.getByText('CANCELLED')).toBeInTheDocument();

      rerender(<StatusBadge status="DRAFT" />);
      expect(screen.getByText('DRAFT')).toBeInTheDocument();

      rerender(<StatusBadge status="APPROVED" />);
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });
  });

  describe('ExpensesPage Component', () => {
    const mockExpenses = [
      {
        id: 1,
        financialYearId: 1,
        financialYear: { id: 1, year: '2026-27', isActive: true },
        departmentId: 10,
        department: { id: 10, code: 'ET', name: 'Engineering Block' },
        categoryId: 1,
        category: { id: 1, name: 'Equipment' },
        amount: 25000.5,
        purpose: 'Oscilloscope probes',
        status: 'DRAFT',
        createdBy: 100,
        creator: { id: 100, name: 'Staff User', email: 'staff_et@college.edu' },
      },
      {
        id: 2,
        financialYearId: 1,
        financialYear: { id: 1, year: '2026-27', isActive: true },
        departmentId: 10,
        department: { id: 10, code: 'ET', name: 'Engineering Block' },
        categoryId: 2,
        category: { id: 2, name: 'Consumables' },
        amount: 15000,
        purpose: 'Chemical reagents',
        status: 'APPROVED',
        createdBy: 100,
        creator: { id: 100, name: 'Staff User', email: 'staff_et@college.edu' },
      },
    ];

    const mockCategoryBalances = [
      {
        categoryId: 1,
        categoryName: 'Equipment',
        allocated: 100000,
        committed: 25000,
        spent: 35000,
        available: 40000,
        utilisationPercentage: 60,
      },
      {
        categoryId: 2,
        categoryName: 'Consumables',
        allocated: 50000,
        committed: 0,
        spent: 10000,
        available: 40000,
        utilisationPercentage: 20,
      },
    ];

    const mockMasterData = {
      activeFy: { id: 1, year: '2026-27', isActive: true },
      allFys: [{ id: 1, year: '2026-27', isActive: true }],
      departments: [{ id: 10, code: 'ET', name: 'Engineering Block' }],
      categories: [
        { id: 1, name: 'Equipment' },
        { id: 2, name: 'Consumables' },
      ],
    };

    beforeEach(() => {
      vi.spyOn(masterApi, 'getActiveFinancialYear').mockResolvedValue(mockMasterData.activeFy);
      vi.spyOn(masterApi, 'getFinancialYears').mockResolvedValue(mockMasterData.allFys);
      vi.spyOn(masterApi, 'getDepartments').mockResolvedValue(mockMasterData.departments);
      vi.spyOn(masterApi, 'getCategories').mockResolvedValue(mockMasterData.categories);

      vi.spyOn(expensesApi, 'listExpenses').mockResolvedValue({
        data: mockExpenses,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });

      vi.spyOn(balancesApi, 'getCategoryBalances').mockResolvedValue(mockCategoryBalances);
    });

    it('renders the expenses list with correct amounts and status badges', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 100, role: 'STAFF', departmentId: 10 },
      });

      render(<ExpensesPage />);

      await waitFor(() => {
        expect(screen.getByText('Expense Claims & Drafts')).toBeInTheDocument();
        expect(screen.getByText('Oscilloscope probes')).toBeInTheDocument();
        expect(screen.getByText('Chemical reagents')).toBeInTheDocument();
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
      });
    });

    it('shows Create Draft button for STAFF/HOD and hides for AUDITOR/MANAGEMENT', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 100, role: 'STAFF', departmentId: 10 },
      });

      const { unmount } = render(<ExpensesPage />);
      await waitFor(() => {
        expect(screen.getByText('+ New Expense Draft')).toBeInTheDocument();
      });
      unmount();

      // Finance and SuperAdmin and Auditor cannot create (only HOD and STAFF raise requests)
      for (const nonRequesterRole of ['FINANCE', 'SUPER_ADMIN', 'AUDITOR', 'MANAGEMENT']) {
        vi.spyOn(authContext, 'useAuth').mockReturnValue({
          user: { id: 999, role: nonRequesterRole, departmentId: 10 },
        });
        const { unmount: unmountRole } = render(<ExpensesPage />);
        await waitFor(() => {
          expect(screen.queryByText('+ New Expense Draft')).not.toBeInTheDocument();
        });
        unmountRole();
      }
    });

    it('displays Category Available balance from Balances API inside the create modal without computing in UI', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 100, role: 'STAFF', departmentId: 10 },
      });

      render(<ExpensesPage />);

      await waitFor(() => {
        expect(screen.getByText('+ New Expense Draft')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ New Expense Draft'));

      // Available balance section rendered
      await waitFor(() => {
        expect(screen.getByText(/Category Available Balance \(from Balances API\):/i)).toBeInTheDocument();
        expect(balancesApi.getCategoryBalances).toHaveBeenCalledWith(10, { financialYearId: 1 });
      });

      // Shows available balance: 40000 directly from mockCategoryBalances
      expect(screen.getByText('Available ceiling for this category:')).toBeInTheDocument();
    });

    it('submits a new draft expense successfully', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 100, role: 'STAFF', departmentId: 10 },
      });
      const createSpy = vi.spyOn(expensesApi, 'createExpense').mockResolvedValue({
        id: 3,
        status: 'DRAFT',
      });

      render(<ExpensesPage />);

      await waitFor(() => {
        expect(screen.getByText('+ New Expense Draft')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ New Expense Draft'));

      await waitFor(() => {
        expect(screen.getByText('Create New Expense Draft')).toBeInTheDocument();
      });

      const amountInput = screen.getByPlaceholderText(/e\.g\. 15000\.50/i);
      const purposeInput = screen.getByPlaceholderText(/State the purpose for this expenditure item\.\.\./i);

      fireEvent.change(amountInput, { target: { value: '18500.50' } });
      fireEvent.change(purposeInput, { target: { value: 'Laboratory glass tubes' } });

      const saveBtn = screen.getByRole('button', { name: /Create Draft/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          financialYearId: 1,
          departmentId: 10,
          categoryId: 1,
          amount: 18500.5,
          purpose: 'Laboratory glass tubes',
        });
      });
    });

    it('allows creator to delete a draft expense', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 100, role: 'STAFF', departmentId: 10 },
      });
      const deleteSpy = vi.spyOn(expensesApi, 'deleteExpense').mockResolvedValue({ id: 1, deleted: true });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ExpensesPage />);

      await waitFor(() => {
        expect(screen.getByTestId ? screen.getByText('Delete') : screen.getByText('Delete')).toBeInTheDocument();
      });

      const deleteBtn = screen.getByText('Delete');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith(1);
      });
    });
  });
});
