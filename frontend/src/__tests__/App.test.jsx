/**
 * App.test.jsx — smoke test for the Iteration 0 React shell.
 * Verifies that App mounts without crashing and renders the heading.
 */
import { render, screen } from '@testing-library/react';
import App from '../App.jsx';

describe('App shell (Iteration 0)', () => {
  it('renders the application heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /Department Budget Spending Tracker/i })
    ).toBeInTheDocument();
  });

  it('shows the Iteration 0 label', () => {
    render(<App />);
    expect(screen.getByText(/Foundation shell/i)).toBeInTheDocument();
  });
});
