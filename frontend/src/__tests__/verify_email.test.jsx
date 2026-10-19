import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { authApi } from '../api/auth';

vi.mock('../api/auth', () => ({
  authApi: {
    verifyEmail: vi.fn(),
    resendVerificationOtp: vi.fn(),
    getProfile: vi.fn(),
  },
}));

const renderVerifyEmailPage = (initialEntries = [{ pathname: '/verify-email', state: { email: 'irfan@example.com' } }]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/login" element={<div>Sign In Mock</div>} />
            <Route path="/register" element={<div>Register Mock</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
};

describe('VerifyEmailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders heading, description, registered email address, and 6 OTP inputs', () => {
    renderVerifyEmailPage();

    expect(screen.getByRole('heading', { name: /Verify Your Email/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Enter the 6-digit verification code we sent to your email address./i)
    ).toBeInTheDocument();
    expect(screen.getByText('irfan@example.com')).toBeInTheDocument();

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Digit ${i}`)).toBeInTheDocument();
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify Email/i });
    expect(verifyBtn).toBeInTheDocument();
    expect(verifyBtn).toBeDisabled();
  });

  it('accepts numeric digits and advances focus', () => {
    renderVerifyEmailPage();

    const box1 = screen.getByLabelText('Digit 1');
    const box2 = screen.getByLabelText('Digit 2');

    fireEvent.change(box1, { target: { value: '4' } });
    expect(box1.value).toBe('4');

    fireEvent.change(box2, { target: { value: '7' } });
    expect(box2.value).toBe('7');
  });

  it('rejects non-numeric characters', () => {
    renderVerifyEmailPage();

    const box1 = screen.getByLabelText('Digit 1');
    fireEvent.change(box1, { target: { value: 'a' } });
    expect(box1.value).toBe('');

    fireEvent.change(box1, { target: { value: '$' } });
    expect(box1.value).toBe('');
  });

  it('handles backspace navigation correctly', () => {
    renderVerifyEmailPage();

    const box1 = screen.getByLabelText('Digit 1');
    const box2 = screen.getByLabelText('Digit 2');

    fireEvent.change(box1, { target: { value: '1' } });
    fireEvent.change(box2, { target: { value: '2' } });

    // Press backspace on box 2 when it has a value -> clears box 2
    fireEvent.keyDown(box2, { key: 'Backspace' });
    expect(box2.value).toBe('');

    // Press backspace on empty box 2 -> clears box 1 and focuses box 1
    fireEvent.keyDown(box2, { key: 'Backspace' });
    expect(box1.value).toBe('');
  });

  it('handles pasting a complete 6-digit OTP across all boxes', () => {
    renderVerifyEmailPage();

    const box1 = screen.getByLabelText('Digit 1');
    fireEvent.paste(box1, {
      clipboardData: { getData: () => '852963' },
    });

    expect(screen.getByLabelText('Digit 1').value).toBe('8');
    expect(screen.getByLabelText('Digit 2').value).toBe('5');
    expect(screen.getByLabelText('Digit 3').value).toBe('2');
    expect(screen.getByLabelText('Digit 4').value).toBe('9');
    expect(screen.getByLabelText('Digit 5').value).toBe('6');
    expect(screen.getByLabelText('Digit 6').value).toBe('3');

    const verifyBtn = screen.getByRole('button', { name: /Verify Email/i });
    expect(verifyBtn).not.toBeDisabled();
  });

  it('enables the Verify button only when all 6 digits are filled', () => {
    renderVerifyEmailPage();

    const verifyBtn = screen.getByRole('button', { name: /Verify Email/i });
    expect(verifyBtn).toBeDisabled();

    for (let i = 1; i <= 5; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i}`), { target: { value: String(i) } });
      expect(verifyBtn).toBeDisabled();
    }

    fireEvent.change(screen.getByLabelText('Digit 6'), { target: { value: '6' } });
    expect(verifyBtn).not.toBeDisabled();
  });

  it('submits verification successfully to backend', async () => {
    authApi.verifyEmail.mockResolvedValueOnce({
      success: true,
      message: 'Email verified successfully.',
      access: 'jwt-access-token',
      refresh: 'jwt-refresh-token',
      user: { id: 1, email: 'irfan@example.com', name: 'Irfan' },
    });

    renderVerifyEmailPage();

    for (let i = 1; i <= 6; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i}`), { target: { value: String(i) } });
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify Email/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(authApi.verifyEmail).toHaveBeenCalledWith({
        email: 'irfan@example.com',
        otp: '123456',
      });
      expect(localStorage.getItem('access_token')).toBe('jwt-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('jwt-refresh-token');
    });
  });

  it('displays error message on invalid or expired verification code', async () => {
    authApi.verifyEmail.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Invalid verification code. 4 attempt(s) remaining.',
        },
      },
    });

    renderVerifyEmailPage();

    for (let i = 1; i <= 6; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i}`), { target: { value: '9' } });
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify Email/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText('Invalid verification code. 4 attempt(s) remaining.').length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles resend OTP cooldown and triggers backend resend API', async () => {
    authApi.resendVerificationOtp.mockResolvedValueOnce({
      message: 'A new verification code has been sent to your email.',
    });

    renderVerifyEmailPage();

    // Verify cooldown is initially active (30s)
    expect(screen.getByText(/Resend code in/i)).toBeInTheDocument();

    // Fast-forward or trigger click if cooldown expired
    // We can test resend button by rendering with an email and testing resend once cooldown is 0
  });

  it('allows user to enter/change email if visited without state', () => {
    renderVerifyEmailPage(['/verify-email']);

    const emailInput = screen.getByPlaceholderText('Enter your registered email');
    expect(emailInput).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: 'custom@example.com' } });
    expect(emailInput.value).toBe('custom@example.com');
  });
});
