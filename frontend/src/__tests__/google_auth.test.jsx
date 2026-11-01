import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import { CompleteProfilePage } from '../pages/CompleteProfilePage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { authApi } from '../api/auth';

vi.mock('../api/auth', () => ({
  authApi: {
    googleAuth: vi.fn(),
    completeGoogleProfile: vi.fn(),
    getProfile: vi.fn(),
  },
}));

describe('Google Authentication Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('GoogleAuthButton', () => {
    it('renders google-auth-button container without crashing', () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <AuthProvider>
              <GoogleAuthButton text="continue_with" />
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      const buttonContainer = screen.getByTestId('google-auth-button');
      expect(buttonContainer).toBeInTheDocument();
    });
  });

  describe('CompleteProfilePage', () => {
    it('redirects to /login if no onboarding_token is provided in state or sessionStorage', async () => {
      render(
        <MemoryRouter initialEntries={['/complete-profile']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
                <Route path="/login" element={<div>Redirected to Login</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Redirected to Login')).toBeInTheDocument();
      });
    });

    it('renders mandatory name input field and text matching user specifications', () => {
      const state = {
        onboarding_token: 'valid.signed.onboarding.token',
        email: 'alex@example.com',
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/complete-profile', state }]}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      expect(screen.getAllByText('Almost There!').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('We just need your name to set up your account.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('alex@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    });

    it('recovers onboarding token from sessionStorage on refresh', () => {
      sessionStorage.setItem('google_onboarding_token', 'refresh.safe.token');
      sessionStorage.setItem('google_onboarding_email', 'persisted@example.com');

      render(
        <MemoryRouter initialEntries={['/complete-profile']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('persisted@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
    });

    it('disables submit button if name is empty or whitespace only', () => {
      const state = {
        onboarding_token: 'valid.signed.onboarding.token',
        email: 'alex@example.com',
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/complete-profile', state }]}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      const submitBtn = screen.getByRole('button', { name: /Continue/i });
      expect(submitBtn).toBeDisabled();

      const input = screen.getByPlaceholderText('Enter your full name');
      fireEvent.change(input, { target: { value: '    ' } });
      expect(submitBtn).toBeDisabled();
    });

    it('successfully submits valid name, clears sessionStorage, saves JWT, and redirects to homepage', async () => {
      const state = {
        onboarding_token: 'valid.signed.onboarding.token',
        email: 'alex@example.com',
      };

      authApi.completeGoogleProfile.mockResolvedValueOnce({
        access: 'google-access-jwt',
        refresh: 'google-refresh-jwt',
        user: {
          id: 42,
          email: 'alex@example.com',
          name: 'Alex Morgan',
          user_type: 'customer',
          is_email_verified: true,
          is_profile_complete: true,
        },
      });

      render(
        <MemoryRouter initialEntries={[{ pathname: '/complete-profile', state }]}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
                <Route path="/" element={<div>Homepage Reached</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText('Enter your full name');
      fireEvent.change(input, { target: { value: 'Alex Morgan' } });
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(authApi.completeGoogleProfile).toHaveBeenCalledWith({
          onboarding_token: 'valid.signed.onboarding.token',
          name: 'Alex Morgan',
        });
        expect(localStorage.getItem('access_token')).toBe('google-access-jwt');
        expect(localStorage.getItem('refresh_token')).toBe('google-refresh-jwt');
        expect(sessionStorage.getItem('google_onboarding_token')).toBeNull();
        expect(screen.getByText('Homepage Reached')).toBeInTheDocument();
      });
    });

    it('clears session and redirects to /login on expired onboarding token error', async () => {
      sessionStorage.setItem('google_onboarding_token', 'expired.token');
      sessionStorage.setItem('google_onboarding_email', 'expired@example.com');

      authApi.completeGoogleProfile.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { detail: 'Onboarding session expired. Please sign in with Google again.' },
        },
      });

      render(
        <MemoryRouter initialEntries={['/complete-profile']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/complete-profile" element={<CompleteProfilePage />} />
                <Route path="/login" element={<div>Redirected to Login Screen</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText('Enter your full name');
      fireEvent.change(input, { target: { value: 'Expired User' } });
      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      await waitFor(() => {
        expect(sessionStorage.getItem('google_onboarding_token')).toBeNull();
        expect(screen.getByText('Redirected to Login Screen')).toBeInTheDocument();
      });
    });
  });
});
