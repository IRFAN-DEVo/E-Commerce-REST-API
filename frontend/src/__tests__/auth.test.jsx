import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProtectedRoute, AdminRoute } from '../components/common/ProtectedRoute';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    getProfile: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

describe('LoginPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form inputs and submit button', () => {
    renderLoginPage();

    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('submits credentials and sets access token upon success', async () => {
    authApi.login.mockResolvedValueOnce({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
    });
    authApi.getProfile.mockResolvedValueOnce({
      id: 1,
      email: 'test@example.com',
      name: 'Test Customer',
      user_type: 'customer',
    });

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(localStorage.getItem('access_token')).toBe('mock-access-token');
    });
  });

  it('displays error message on invalid credentials', async () => {
    authApi.login.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { detail: 'No active account found with the given credentials' },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'bad@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      const errorElements = screen.getAllByText(
        'No active account found with the given credentials'
      );
      expect(errorElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('RegisterPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('submits valid registration form data', async () => {
    authApi.register.mockResolvedValueOnce({
      success: true,
      user: { id: 2, name: 'Alice', email: 'alice@example.com' },
    });

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'Alice Smith' },
    });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('9876543210'), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText('Min 8 characters'), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByPlaceholderText('Repeat password'), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '9876543210',
        password: 'Password123!',
        confirm_password: 'Password123!',
      });
    });
  });
});

describe('Protected and Admin route navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('redirects unauthenticated user away from ProtectedRoute to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Login Page Redirect Target</div>} />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <div>Secret Checkout Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page Redirect Target')).toBeInTheDocument();
      expect(screen.queryByText('Secret Checkout Content')).not.toBeInTheDocument();
    });
  });

  it('redirects non-owner customer away from AdminRoute to home', async () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'cust@example.com', user_type: 'customer' }));
    authApi.getProfile.mockResolvedValue({ id: 1, email: 'cust@example.com', user_type: 'customer' });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<div>Storefront Home Page</div>} />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <div>Admin Dashboard Content</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Storefront Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Admin Dashboard Content')).not.toBeInTheDocument();
    });
  });

  it('resets authentication state when auth:logout event is dispatched', async () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'cust@example.com' }));
    authApi.getProfile.mockResolvedValue({ id: 1, email: 'cust@example.com' });

    const StatusWatcher = () => {
      const { isAuthenticated } = useAuth();
      return <div>Auth Status: {isAuthenticated ? 'Authenticated' : 'Logged Out'}</div>;
    };

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <StatusWatcher />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Auth Status: Authenticated')).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    });

    await waitFor(() => {
      expect(screen.getByText('Auth Status: Logged Out')).toBeInTheDocument();
    });
  });
});
