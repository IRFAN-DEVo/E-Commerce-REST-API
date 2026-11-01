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
    it('redirects to /login if no onboarding_token is provided in location state', async () => {
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

    it('renders verified email badge and name input field when onboarding token exists', () => {
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

      expect(screen.getByText('alex@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. Alex Morgan')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Complete & Continue/i })).toBeInTheDocument();
    });

    it('disables submit button if name is empty or only whitespace', () => {
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

      const submitBtn = screen.getByRole('button', { name: /Complete & Continue/i });
      expect(submitBtn).toBeDisabled();

      const input = screen.getByPlaceholderText('e.g. Alex Morgan');
      fireEvent.change(input, { target: { value: '    ' } });
      expect(submitBtn).toBeDisabled();
    });

    it('successfully submits valid name, saves tokens, and completes onboarding', async () => {
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

      const input = screen.getByPlaceholderText('e.g. Alex Morgan');
      fireEvent.change(input, { target: { value: 'Alex Morgan' } });
      fireEvent.click(screen.getByRole('button', { name: /Complete & Continue/i }));

      await waitFor(() => {
        expect(authApi.completeGoogleProfile).toHaveBeenCalledWith({
          onboarding_token: 'valid.signed.onboarding.token',
          name: 'Alex Morgan',
        });
        expect(localStorage.getItem('access_token')).toBe('google-access-jwt');
        expect(localStorage.getItem('refresh_token')).toBe('google-refresh-jwt');
        expect(screen.getByText('Homepage Reached')).toBeInTheDocument();
      });
    });
  });
});
