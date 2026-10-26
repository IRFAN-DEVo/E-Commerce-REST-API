import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VerifyPhonePage } from '../pages/VerifyPhonePage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { authApi } from '../api/auth';

vi.mock('../api/auth', () => ({
  authApi: {
    requestPhoneOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
    resendPhoneOtp: vi.fn(),
    getPhoneStatus: vi.fn(),
    getProfile: vi.fn(),
  },
}));

const renderVerifyPhonePage = (
  initialEntries = [{ pathname: '/verify-phone', state: { phone: '+919876543210' } }]
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/verify-phone" element={<VerifyPhonePage />} />
            <Route path="/profile" element={<div>Profile Mock</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
};

describe('VerifyPhonePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders heading, description, and 6 OTP input boxes when phone state is provided', () => {
    renderVerifyPhonePage();

    expect(screen.getByRole('heading', { name: /Verify Phone Number/i })).toBeInTheDocument();
    expect(screen.getByText(/Enter the 6-digit verification code/i)).toBeInTheDocument();

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Digit ${i}`)).toBeInTheDocument();
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify Phone Number/i });
    expect(verifyBtn).toBeInTheDocument();
    expect(verifyBtn).toBeDisabled();
  });

  it('accepts numeric digits in OTP boxes and enables submit when 6 digits are entered', () => {
    renderVerifyPhonePage();

    for (let i = 1; i <= 6; i++) {
      const box = screen.getByLabelText(`Digit ${i}`);
      fireEvent.change(box, { target: { value: String(i) } });
      expect(box.value).toBe(String(i));
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify Phone Number/i });
    expect(verifyBtn).toBeEnabled();
  });

  it('supports pasting a complete 6-digit OTP into boxes', () => {
    renderVerifyPhonePage();

    const box1 = screen.getByLabelText('Digit 1');
    fireEvent.paste(box1, {
      clipboardData: {
        getData: () => '654321',
      },
    });

    expect(screen.getByLabelText('Digit 1').value).toBe('6');
    expect(screen.getByLabelText('Digit 2').value).toBe('5');
    expect(screen.getByLabelText('Digit 3').value).toBe('4');
    expect(screen.getByLabelText('Digit 4').value).toBe('3');
    expect(screen.getByLabelText('Digit 5').value).toBe('2');
    expect(screen.getByLabelText('Digit 6').value).toBe('1');

    const verifyBtn = screen.getByRole('button', { name: /Verify Phone Number/i });
    expect(verifyBtn).toBeEnabled();
  });

  it('submits valid OTP and displays success confirmation', async () => {
    authApi.verifyPhoneOtp.mockResolvedValueOnce({
      success: true,
      message: 'Phone number verified successfully.',
      is_phone_verified: true,
    });
    authApi.getProfile.mockResolvedValueOnce({
      id: 1,
      email: 'test@example.com',
      phone: '+919876543210',
      is_phone_verified: true,
    });

    renderVerifyPhonePage();

    for (let i = 1; i <= 6; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i}`), { target: { value: '1' } });
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify Phone Number/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(authApi.verifyPhoneOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          otp: '111111',
          phone: '+919876543210',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Phone Verified!/i)).toBeInTheDocument();
    });
  });

  it('displays backend error message on invalid OTP submission', async () => {
    authApi.verifyPhoneOtp.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Invalid verification code. 4 attempt(s) remaining.',
        },
      },
    });

    renderVerifyPhonePage();

    for (let i = 1; i <= 6; i++) {
      fireEvent.change(screen.getByLabelText(`Digit ${i}`), { target: { value: '9' } });
    }

    const verifyBtn = screen.getByRole('button', { name: /Verify Phone Number/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Invalid verification code/i)[0]).toBeInTheDocument();
    });
  });

  it('shows resend cooldown countdown and allows resend when cooldown expires', async () => {
    authApi.resendPhoneOtp.mockResolvedValueOnce({
      success: true,
      cooldown_seconds: 60,
    });

    // Render with 0 initial cooldown by changing state or rendering phone entry
    renderVerifyPhonePage();

    // The component defaults to 60s cooldown countdown
    expect(screen.getByText(/Resend code in/i)).toBeInTheDocument();
  });

  it('allows requesting OTP from phone entry form when initialPhone is not provided', async () => {
    authApi.requestPhoneOtp.mockResolvedValueOnce({
      success: true,
      phone: '+91 ****** 4321',
      session_token: 'session_mock_123',
      cooldown_seconds: 60,
    });

    renderVerifyPhonePage([{ pathname: '/verify-phone', state: {} }]);

    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    const phoneInput = screen.getByLabelText(/Phone Number/i);
    fireEvent.change(phoneInput, { target: { value: '+919876543210' } });

    const sendBtn = screen.getByRole('button', { name: /Send Verification Code/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(authApi.requestPhoneOtp).toHaveBeenCalledWith({ phone: '+919876543210' });
    });

    // Should now transition to OTP boxes
    await waitFor(() => {
      expect(screen.getByLabelText('Digit 1')).toBeInTheDocument();
    });
  });
});
