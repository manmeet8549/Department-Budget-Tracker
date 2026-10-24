import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('LoginPage Component', () => {
  it('renders input fields with proper labels and accessible roles', async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });
  });

  it('populates fields when a demo role button is clicked', async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
    });

    const adminBtn = screen.getByRole('button', { name: /Admin/i });
    fireEvent.click(adminBtn);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i).value).toBe('superadmin@college.edu');
      expect(screen.getByLabelText(/Password/i).value).toBe('Password@123');
    });
  });
});
