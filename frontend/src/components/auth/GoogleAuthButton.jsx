import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../api/auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const GoogleAuthButtonInner = ({ text = 'continue_with' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAuthSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      showToast('No credential returned from Google.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authApi.googleAuth(idToken);

      if (data.is_new_user || data.needs_name) {
        // Direct new user to manual name-entry screen
        // Store in sessionStorage for refresh safety
        if (data.onboarding_token) {
          sessionStorage.setItem('google_onboarding_token', data.onboarding_token);
        }
        if (data.email) {
          sessionStorage.setItem('google_onboarding_email', data.email);
        }
        showToast('Google account verified! Please enter your name to complete your profile.', 'info');
        navigate('/complete-profile', {
          state: {
            onboarding_token: data.onboarding_token,
            email: data.email,
            from: location.state?.from || '/',
          },
        });
      } else {
        // Existing user: direct login
        await setAuthSession(data);
        showToast('Welcome back! Signed in with Google.', 'success');
        const dest = location.state?.from?.pathname || location.state?.from || '/';
        navigate(dest, { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Google authentication failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    showToast('Google Sign-In was cancelled or failed.', 'error');
  };

  return (
    <div
      className="google-auth-button-container"
      data-testid="google-auth-button"
      style={{
        width: '100%',
        minHeight: '44px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isLoading ? (
        <div
          className="btn btn-secondary"
          style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            color: '#71717a',
            cursor: 'not-allowed',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid #a1a1aa',
              borderTopColor: '#000000',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Verifying with Google...</span>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text={text}
            shape="rectangular"
            size="large"
            width="100%"
            theme="outline"
          />
        </div>
      )}
    </div>
  );
};

export const GoogleAuthButton = (props) => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'dummy-google-client-id'}>
      <GoogleAuthButtonInner {...props} />
    </GoogleOAuthProvider>
  );
};

export default GoogleAuthButton;

