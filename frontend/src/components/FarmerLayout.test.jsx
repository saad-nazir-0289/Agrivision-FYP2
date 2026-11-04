import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FarmerLayout from './FarmerLayout';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../services/AuthContext';

vi.mock('../services/AuthContext', () => ({ useAuth: vi.fn() })); // we control who is "logged in"

const farmer = { name: 'Areeba', email: 'areeba@test.com', role: 'farmer' };
const admin = { name: 'Boss', email: 'boss@test.com', role: 'admin' };

function renderAt(path, user, logout = vi.fn()) {
  useAuth.mockReturnValue({ user, loading: false, logout });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/admin" element={<p>Admin page</p>} />
        <Route element={<ProtectedRoute role="farmer"><FarmerLayout /></ProtectedRoute>}>
          <Route path="/" element={<p>Dashboard page</p>} />
          <Route path="/trends" element={<p>Trends page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  return logout;
}

describe('Farmer layout', () => {
  it('sends a logged-out visitor to the login page', () => {
    renderAt('/', null);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('sends an admin to the admin page instead of the farmer pages', () => {
    renderAt('/', admin);
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });

  it('shows the four navigation links and marks the current page', () => {
    renderAt('/', farmer);
    for (const name of ['Dashboard Home', 'NDVI Map', 'Alerts', 'Trends']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Dashboard Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Trends' })).not.toHaveAttribute('aria-current');
  });

  it('moves to another page and highlights its link', async () => {
    renderAt('/', farmer);
    await userEvent.click(screen.getByRole('link', { name: 'Trends' }));
    expect(screen.getByText('Trends page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trends' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('Profile menu', () => {
  it('opens to show the user and closes with Escape', async () => {
    renderAt('/', farmer);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Areeba/ }));
    expect(screen.getByText('areeba@test.com')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when the user clicks elsewhere', async () => {
    renderAt('/', farmer);
    await userEvent.click(screen.getByRole('button', { name: /Areeba/ }));
    await userEvent.click(screen.getByText('Dashboard page'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('logs the user out', async () => {
    const logout = renderAt('/', farmer);
    await userEvent.click(screen.getByRole('button', { name: /Areeba/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledOnce();
  });
});