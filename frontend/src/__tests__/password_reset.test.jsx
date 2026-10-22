import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { ToastProvider } from '../context/ToastContext';
import { authApi } from '../api/auth';

vi.mock('../api/auth', () => ({
  authApi: {
    forgotPassword: vi.fn(),
    verifyOtp: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const renderResetPasswordPage = (initialEntries = ['/reset-password']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login Page Mock</div>} />
          <Route path="/profile" element={<div>Profile Page Mock</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
};

describe('ResetPasswordPage Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Step 1 (Request OTP) when no email in route state', () => {
    renderResetPasswordPage(['/reset-password']);

    expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Verification Code/i })).toBeInTheDocument();
  });

  it('submits Step 1 email and moves to Step 2 (Verify Security Code)', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({
      detail: 'If an account exists, an OTP has been sent.',
    });

    renderResetPasswordPage(['/reset-password']);

    const emailInput = screen.getByPlaceholderText('name@example.com');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send Verification Code/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(screen.getByRole('heading', { name: /Verify Security Code/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    });
  });

  it('initiates directly in Step 2 with autoSend when navigated with email state', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({
      detail: 'If an account exists, an OTP has been sent.',
    });

    renderResetPasswordPage([
      { pathname: '/reset-password', state: { email: 'profile@example.com', autoSend: true } },
    ]);

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith('profile@example.com');
      expect(screen.getByRole('heading', { name: /Verify Security Code/i })).toBeInTheDocument();
    });
  });

  it('falls back to Step 1 and resets cooldown if autoSend fails on mount', async () => {
    authApi.forgotPassword.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Unable to dispatch password reset email. Please try again shortly.',
        },
      },
    });

    renderResetPasswordPage([
      { pathname: '/reset-password', state: { email: 'profile@example.com', autoSend: true } },
    ]);

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith('profile@example.com');
      expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Unable to dispatch password reset email/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('disables Verify button until 6 digits are entered in Step 2', async () => {
    renderResetPasswordPage([
      { pathname: '/reset-password', state: { email: 'user@example.com' } },
    ]);

    expect(screen.getByRole('heading', { name: /Verify Security Code/i })).toBeInTheDocument();

    const otpInput = screen.getByPlaceholderText('123456');
    const verifyBtn = screen.getByRole('button', { name: /Verify Code/i });

    // Initially empty -> button disabled
    expect(verifyBtn).toBeDisabled();

    // 3 digits -> button still disabled
    fireEvent.change(otpInput, { target: { value: '123' } });
    expect(verifyBtn).toBeDisabled();

    // 6 digits -> button enabled
    fireEvent.change(otpInput, { target: { value: '123456' } });
    expect(verifyBtn).not.toBeDisabled();
  });

  it('displays error on invalid or expired OTP in Step 2', async () => {
    authApi.verifyOtp.mockRejectedValueOnce({
      response: { data: { detail: 'Invalid or expired OTP code.' } },
    });

    renderResetPasswordPage([
      { pathname: '/reset-password', state: { email: 'user@example.com' } },
    ]);

    const otpInput = screen.getByPlaceholderText('123456');
    fireEvent.change(otpInput, { target: { value: '999999' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify Code/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        otp: '999999',
      });
      expect(screen.getAllByText('Invalid or expired OTP code.').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('transitions to Step 3 upon successful OTP verification with reset_token', async () => {
    authApi.verifyOtp.mockResolvedValueOnce({
      detail: 'OTP verified successfully.',
      reset_token: 'mock-valid-reset-token-12345',
    });

    renderResetPasswordPage([
      { pathname: '/reset-password', state: { email: 'user@example.com' } },
    ]);

    const otpInput = screen.getByPlaceholderText('123456');
    fireEvent.change(otpInput, { target: { value: '123456' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify Code/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create New Password/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Min 8 characters')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Repeat new password')).toBeInTheDocument();
    });
  });

  it('prevents Step 3 submission if passwords do not match', async () => {
    authApi.verifyOtp.mockResolvedValueOnce({
      detail: 'OTP verified successfully.',
      reset_token: 'mock-valid-reset-token-12345',
    });

    renderResetPasswordPage([
      { pathname: '/reset-password', state: { email: 'user@example.com' } },
    ]);

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify Code/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create New Password/i })).toBeInTheDocument();
    });

    const passInput = screen.getByPlaceholderText('Min 8 characters');
    const confirmInput = screen.getByPlaceholderText('Repeat new password');

    fireEvent.change(passInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });
  });

  it('successfully resets password in Step 3 and redirects to sign in', async () => {
    authApi.verifyOtp.mockResolvedValueOnce({
      detail: 'OTP verified successfully.',
      reset_token: 'mock-valid-reset-token-12345',
    });
    authApi.resetPassword.mockResolvedValueOnce({
      detail: 'Password has been reset successfully. Please log in with your new password.',
    });

    renderResetPasswordPage([
      { pathname: '/reset-password', state: { email: 'user@example.com' } },
    ]);

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify Code/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create New Password/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Min 8 characters'), {
      target: { value: 'NewSecurePass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat new password'), {
      target: { value: 'NewSecurePass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        reset_token: 'mock-valid-reset-token-12345',
        password: 'NewSecurePass123!',
        confirm_password: 'NewSecurePass123!',
      });
      expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
    });
  });

  it('renders "Back to Profile Settings" and navigates to profile when entering from Profile Settings', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({
      detail: 'If an account exists, an OTP has been sent.',
    });

    renderResetPasswordPage([
      {
        pathname: '/reset-password',
        state: {
          email: 'user@example.com',
          autoSend: true,
          from: 'profile',
          returnTo: '/profile?tab=settings',
        },
      },
    ]);

    const backLink = screen.getByRole('link', { name: /Back to Profile Settings/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute('href')).toBe('/profile?tab=settings');

    fireEvent.click(backLink);

    await waitFor(() => {
      expect(screen.getByText('Profile Page Mock')).toBeInTheDocument();
    });
  });

  it('renders "Back to Sign In" and navigates to login when entering from unauthenticated flow', () => {
    renderResetPasswordPage([
      {
        pathname: '/reset-password',
        state: { email: 'user@example.com' },
      },
    ]);

    const backLink = screen.getByRole('link', { name: /Back to Sign In/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute('href')).toBe('/login');

    fireEvent.click(backLink);
    expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
  });
});
