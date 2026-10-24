import { render, screen, waitFor } from '@testing-library/react';
import App from '../App.jsx';

describe('App & Authentication Routing (Iteration 1)', () => {
  it('redirects unauthenticated users to the login page', async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Budget Spending Tracker/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });
  });

  it('renders demo seed role buttons on login screen', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/DEMO SEED ROLES/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Admin/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /HoD \(ET\)/i })).toBeInTheDocument();
    });
  });
});
