import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import authHeroImg from '../assets/auth_hero.jpg';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      showToast('Welcome back! Signed in successfully.', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'No active account found with the given credentials';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* Left Panel: Hero Graphic (Screenshot #5) */}
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
            }}
          >
            <span>Welcome Back</span>
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
            Sign in to your account and continue your journey.
          </h2>
          <p style={{ color: '#d4d4d8', fontSize: '1rem', maxWidth: '420px', lineHeight: 1.6 }}>
            Access exclusive collections, track your purchases, and enjoy seamless one-click checkout.
          </p>
        </div>
      </div>

      {/* Right Panel: Clean White Login Card (Screenshot #5) */}
      <div className="auth-form-panel">
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
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
              Login
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.25rem' }}>
              Enter your credentials to access your account
            </p>
          </div>

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
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Mail
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

            {/* Password Field */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500 }}
                  onMouseEnter={(e) => e.target.style.color = '#000'}
                  onMouseLeave={(e) => e.target.style.color = '#71717a'}
                >
                  Forgot password?
                </Link>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#a1a1aa',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#71717a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Solid Black Login / Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem', borderRadius: '6px' }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Social Separator (Screenshot #5) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.75rem 0',
              color: '#a1a1aa',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
            <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          </div>

          {/* Social Login Buttons (Screenshot #5) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8125rem', borderRadius: '6px' }}
              onClick={() => showToast('Google login is coming soon.', 'info')}
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8125rem', borderRadius: '6px' }}
              onClick={() => showToast('Apple login is coming soon.', 'info')}
            >
              Continue with Apple
            </button>
          </div>

          {/* Footer Register Link */}
          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: '#71717a' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ fontWeight: 600, color: '#000000', textDecoration: 'underline' }}
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
