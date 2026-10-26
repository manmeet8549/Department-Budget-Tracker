import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import FinancialYearsPage from './features/master/FinancialYearsPage.jsx';
import DepartmentsPage from './features/master/DepartmentsPage.jsx';
import CategoriesPage from './features/master/CategoriesPage.jsx';
import BudgetsPage from './features/budgets/BudgetsPage.jsx';
import ExpensesPage from './features/expenses/ExpensesPage.jsx';
import Card from './components/Card.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public login page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes wrapped in AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/financial-years"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <FinancialYearsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <CategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/budgets"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'HOD', 'STAFF', 'AUDITOR']}>
                    <BudgetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'HOD', 'STAFF', 'AUDITOR']}>
                    <ExpensesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', letterSpacing: 'var(--dp-tracking-tight)', color: 'var(--dp-color-ink)' }}>
                          <span className="sr-only">User Directory</span>
                          <span aria-hidden="true">
                            User <span className="dp-title-accent">Directory</span>
                          </span>
                        </h1>
                        <p style={{ margin: '6px 0 0 0', color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-body)' }}>
                          Manage staff credentials, department allocations, and institutional access levels.
                        </p>
                      </div>
                      <Card style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                            User Directory (SUPER_ADMIN)
                          </h3>
                          <p style={{ margin: 0, color: 'var(--dp-color-ink-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                            Super Admin user management interface for provisioning accounts, assigning roles, and toggling user active states.
                          </p>
                        </div>
                      </Card>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'AUDITOR']}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', letterSpacing: 'var(--dp-tracking-tight)', color: 'var(--dp-color-ink)' }}>
                          <span className="sr-only">Audit Trail &amp; System Logs</span>
                          <span aria-hidden="true">
                            Audit Trail &amp; System <span className="dp-title-accent">Logs</span>
                          </span>
                        </h1>
                        <p style={{ margin: '6px 0 0 0', color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-body)' }}>
                          Immutable, historical transaction logs tracking financial operations and state transitions.
                        </p>
                      </div>
                      <Card style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                            Audit Trail (SUPER_ADMIN &amp; AUDITOR)
                          </h3>
                          <p style={{ margin: 0, color: 'var(--dp-color-ink-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                            Read-only historical audit trail of all insert, update, review, and deletion writes across modules.
                          </p>
                        </div>
                      </Card>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
