import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import ProductDiagram from '../components/ProductDiagram.jsx';
import * as authContext from '../features/auth/AuthContext.jsx';
import * as dashboardApi from '../api/dashboard.js';
import { formatINR } from '../utils/currency.js';

describe('Dashboard Module Frontend (Iteration 5)', () => {
  const mockDeptET = {
    id: 1,
    code: 'ET',
    name: 'Electronics and Telecommunication',
    parentCode: null,
    allocated: '800000.00',
    committed: '150000.50',
    spent: '50000.00',
    available: '599999.50',
    utilisationPercent: 25.0,
  };

  const mockDeptHM = {
    id: 3,
    code: 'HM',
    name: 'Hotel Management',
    parentCode: null,
    allocated: '500000.00',
    committed: '0.00',
    spent: '120000.00',
    available: '380000.00',
    utilisationPercent: 24.0,
  };

  const mockDeptBBA = {
    id: 5,
    code: 'BBA',
    name: 'Bachelor of Business Administration',
    parentCode: 'MT',
    allocated: '300000.00',
    committed: '100000.00',
    spent: '50000.00',
    available: '150000.00',
    utilisationPercent: 50.0,
  };

  const mockCollegeSummary = {
    financialYear: {
      id: 1,
      year: '2026-27',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2027-03-31T00:00:00.000Z',
      isActive: true,
      status: 'OPEN',
    },
    college: {
      allocated: '1600000.00',
      committed: '250000.50',
      spent: '220000.00',
      available: '1129999.50',
      utilisationPercent: 29.38,
    },
    departments: [mockDeptET, mockDeptHM, mockDeptBBA],
  };

  const mockHodSummary = {
    financialYear: {
      id: 1,
      year: '2026-27',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2027-03-31T00:00:00.000Z',
      isActive: true,
      status: 'OPEN',
    },
    college: null,
    departments: [mockDeptET],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ProductDiagram Component', () => {
    it('renders dynamic tiles matching API departments and accessible text alternative', () => {
      const depts = [mockDeptET, mockDeptHM, mockDeptBBA];
      render(<ProductDiagram departments={depts} />);

      // Visually hidden text alternative
      const srText = screen.getByText(
        /Budget control system connected to departments: Electronics and Telecommunication \(ET\), Hotel Management \(HM\), Bachelor of Business Administration \(BBA\)\./i
      );
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass('sr-only');

      // Center node
      expect(screen.getByText('Budget control')).toBeInTheDocument();

      // Dynamic department tiles
      expect(screen.getByTestId('diagram-tile-ET')).toBeInTheDocument();
      expect(screen.getByTestId('diagram-tile-HM')).toBeInTheDocument();
      expect(screen.getByTestId('diagram-tile-BBA')).toBeInTheDocument();
    });

    it('renders gracefully when departments array is empty', () => {
      render(<ProductDiagram departments={[]} />);
      expect(
        screen.getByText('Budget control system with no connected departments.')
      ).toBeInTheDocument();
      expect(screen.getByText('Budget control')).toBeInTheDocument();
    });
  });

  describe('DashboardPage Role Scoping and Layout', () => {
    it('Management sees header with ProductDiagram, ruled facts strip, and all department cards', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 2, email: 'management@college.edu', role: 'MANAGEMENT' },
      });
      vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(mockCollegeSummary);

      render(<DashboardPage />);

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByText('College Budget & Spending Overview')).toBeInTheDocument();
      });

      // Ruled facts strip with college totals
      const factsStrip = screen.getByTestId('college-facts-strip');
      expect(factsStrip).toBeInTheDocument();
      expect(factsStrip).toHaveTextContent(formatINR(mockCollegeSummary.college.allocated));
      expect(factsStrip).toHaveTextContent(formatINR(mockCollegeSummary.college.committed));
      expect(factsStrip).toHaveTextContent(formatINR(mockCollegeSummary.college.spent));
      expect(factsStrip).toHaveTextContent(formatINR(mockCollegeSummary.college.available));
      expect(factsStrip).toHaveTextContent('29.38%');

      // ProductDiagram is displayed on the header
      expect(screen.getByTestId('diagram-tile-ET')).toBeInTheDocument();
      expect(screen.getByTestId('diagram-tile-HM')).toBeInTheDocument();
      expect(screen.getByTestId('diagram-tile-BBA')).toBeInTheDocument();

      // All 3 department cards are rendered
      expect(screen.getByTestId('department-card-ET')).toBeInTheDocument();
      expect(screen.getByTestId('department-card-HM')).toBeInTheDocument();
      expect(screen.getByTestId('department-card-BBA')).toBeInTheDocument();

      // Sub-unit displays parentCode
      expect(screen.getByText('Sub-unit of MT')).toBeInTheDocument();
    });

    it('HOD sees only their department card and college totals strip is null/absent', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 4, email: 'hod_et@college.edu', role: 'HOD', departmentId: 1 },
      });
      vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(mockHodSummary);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Department Budget Overview')).toBeInTheDocument();
      });

      // College facts strip should NOT be rendered
      expect(screen.queryByTestId('college-facts-strip')).toBeNull();

      // Only one department card should be rendered
      expect(screen.getByTestId('department-card-ET')).toBeInTheDocument();
      expect(screen.queryByTestId('department-card-HM')).toBeNull();
      expect(screen.queryByTestId('department-card-BBA')).toBeNull();
    });

    it('STAFF sees only their department card and college totals strip is absent', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 14, email: 'staff_et@college.edu', role: 'STAFF', departmentId: 1 },
      });
      vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(mockHodSummary);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Department Budget Overview')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('college-facts-strip')).toBeNull();
      expect(screen.getByTestId('department-card-ET')).toBeInTheDocument();
    });
  });

  describe('Card formatting and figures', () => {
    it('renders figures in Indian format with exact decimal handling and progress bar', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 4, email: 'hod_et@college.edu', role: 'HOD', departmentId: 1 },
      });
      vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(mockHodSummary);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('department-card-ET')).toBeInTheDocument();
      });

      const card = screen.getByTestId('department-card-ET');

      // Metric checks
      expect(card).toHaveTextContent(formatINR(mockDeptET.allocated)); // ₹ 8,00,000
      expect(card).toHaveTextContent(formatINR(mockDeptET.committed)); // ₹ 1,50,000.50
      expect(card).toHaveTextContent(formatINR(mockDeptET.spent));     // ₹ 50,000
      expect(card).toHaveTextContent(formatINR(mockDeptET.available)); // ₹ 5,99,999.50

      // Progress bar and utilisation label
      expect(card).toHaveTextContent('25% used');
      const progressBar = screen.getByRole('progressbar', {
        name: /Electronics and Telecommunication budget utilisation 25%/i,
      });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });
  });

  describe('Loading, Empty, and Error States', () => {
    it('shows loading state while fetching summary', () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 2, role: 'MANAGEMENT' },
      });
      // Return a pending promise
      vi.spyOn(dashboardApi, 'getDashboardSummary').mockReturnValue(new Promise(() => {}));

      render(<DashboardPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/Loading dashboard data.../i)).toBeInTheDocument();
    });

    it('shows empty state when no approved department budgets exist', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 2, role: 'MANAGEMENT' },
      });
      vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue({
        financialYear: { id: 1, year: '2026-27' },
        college: { allocated: '0.00', committed: '0.00', spent: '0.00', available: '0.00', utilisationPercent: 0 },
        departments: [],
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/No approved department budgets found for this financial year\./i)
        ).toBeInTheDocument();
      });
    });

    it('shows error state with retry button when API fails, and retry triggers refetch', async () => {
      vi.spyOn(authContext, 'useAuth').mockReturnValue({
        user: { id: 2, role: 'MANAGEMENT' },
      });
      const fetchMock = vi
        .spyOn(dashboardApi, 'getDashboardSummary')
        .mockRejectedValueOnce({
          response: { data: { error: { message: 'Network connection failure' } } },
        })
        .mockResolvedValueOnce(mockCollegeSummary);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Network connection failure')).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Test keyboard focusability
      retryBtn.focus();
      expect(document.activeElement).toBe(retryBtn);

      // Trigger retry
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('College Budget & Spending Overview')).toBeInTheDocument();
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
