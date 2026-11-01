import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/auth';
import authHeroImg from '../assets/auth_hero.jpg';

export const CompleteProfilePage = () => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { setAuthSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Refresh-safe token and email recovery: checks navigation state, then falls back to sessionStorage
  const [onboardingToken] = useState(() => {
    const fromState = location.state?.onboarding_token;
    if (fromState) {
      sessionStorage.setItem('google_onboarding_token', fromState);
      return fromState;
    }
    return sessionStorage.getItem('google_onboarding_token') || '';
  });

  const [verifiedEmail] = useState(() => {
    const fromState = location.state?.email;
    if (fromState) {
      sessionStorage.setItem('google_onboarding_email', fromState);
      return fromState;
    }
    return sessionStorage.getItem('google_onboarding_email') || '';
  });

  const from = location.state?.from?.pathname || location.state?.from || '/';

  // Protect against direct navigation without a valid onboarding session
  useEffect(() => {
    if (!onboardingToken) {
      showToast('No active onboarding session found. Please sign in with Google.', 'error');
      navigate('/login', { replace: true });
    }
  }, [onboardingToken, navigate, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanedName = name.trim();
    if (!cleanedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await authApi.completeGoogleProfile({
        onboarding_token: onboardingToken,
        name: cleanedName,
      });

      // Cleanup onboarding session on successful account finalization
      sessionStorage.removeItem('google_onboarding_token');
      sessionStorage.removeItem('google_onboarding_email');

      await setAuthSession(data);
      showToast(`Welcome to DjangoMart, ${cleanedName}!`, 'success');
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.error ||
        'Failed to complete profile. Please try again.';

      setErrorMessage(msg);
      showToast(msg, 'error');

      // If token expired, clear cached session and guide user back to Google Sign-In
      if (err.response?.status === 400 && msg.toLowerCase().includes('expired')) {
        sessionStorage.removeItem('google_onboarding_token');
        sessionStorage.removeItem('google_onboarding_email');
        navigate('/login', { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!onboardingToken) {
    return null;
  }

  return (
    <div className="auth-split-wrapper">
      {/* Left Panel: Hero Graphic */}
      <div
        className="auth-hero-panel"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 100%), url(${authHeroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              marginBottom: '1rem',
              color: '#ffffff',
            }}
          >
            <span>One Last Step</span>
          </div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: '0.75rem',
              letterSpacing: '-0.025em',
            }}
          >
            Almost There!
          </h2>
          <p style={{ color: '#d4d4d8', fontSize: '1rem', maxWidth: '420px', lineHeight: 1.6 }}>
            We just need your name to set up your account.
          </p>
        </div>
      </div>

      {/* Right Panel: Name Entry Card */}
      <div className="auth-form-panel">
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 800,
                fontSize: '1.5rem',
                color: '#000000',
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBag size={18} />
              </div>
              <span>DjangoMart</span>
            </Link>

            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#000000', letterSpacing: '-0.02em' }}>
              Almost There!
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.25rem' }}>
              We just need your name to set up your account.
            </p>
          </div>

          {/* Verified Google Email Badge */}
          {verifiedEmail && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f4f4f5',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.8125rem',
                color: '#3f3f46',
                border: '1px solid #e4e4e7',
              }}
            >
              <CheckCircle2 size={16} color="#16a34a" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.6875rem', color: '#71717a', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                  Verified Google Account
                </span>
                <span style={{ fontWeight: 600, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  {verifiedEmail}
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                marginBottom: '1.5rem',
                border: '1px solid #fee2e2',
              }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="fullName"
                  type="text"
                  required
                  autoFocus
                  className="form-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  maxLength={150}
                />
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#a1a1aa',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                marginTop: '1rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{isSubmitting ? 'Saving...' : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8125rem', color: '#71717a' }}>
            Want to use a different account?{' '}
            <Link to="/login" style={{ fontWeight: 600, color: '#000000', textDecoration: 'underline' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
