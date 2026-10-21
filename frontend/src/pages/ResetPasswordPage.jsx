import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Key, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = Boolean(auth?.isAuthenticated);
  } catch {
    isAuthenticated = Boolean(localStorage.getItem('access_token'));
  }

  const requestedReturnTo = location.state?.returnTo;
  const isFromProfile =
    location.state?.from === 'profile' ||
    requestedReturnTo === '/profile?tab=settings' ||
    requestedReturnTo === '/profile' ||
    (Boolean(location.state?.autoSend) && isAuthenticated);

  const ALLOWED_RETURN_PATHS = ['/profile?tab=settings', '/profile', '/forgot-password', '/login'];

  const backDestination = isFromProfile
    ? '/profile?tab=settings'
    : (ALLOWED_RETURN_PATHS.includes(requestedReturnTo) ? requestedReturnTo : '/login');

  const backLabel = isFromProfile ? 'Back to Profile Settings' : 'Back to Sign In';

  const initialEmail = location.state?.email || '';
  const autoSend = Boolean(location.state?.autoSend);

  // Steps: 1: 'request' | 2: 'verify' | 3: 'reset'
  const [step, setStep] = useState(initialEmail ? 2 : 1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState(null); // in-memory only
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(autoSend ? 60 : 0);
  const [errorMessage, setErrorMessage] = useState('');

  const autoSendTriggered = useRef(false);

  // Send or Resend OTP
  const handleSendOtp = useCallback(async (targetEmail) => {
    const cleanEmail = (targetEmail || email).trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await authApi.forgotPassword(cleanEmail);
      showToast('If an account exists, a 6-digit OTP code has been sent.', 'success');
      setResendCooldown(60);
      setStep(2);
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send OTP code. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [email, showToast]);

  // Handle autoSend on mount if navigated from Profile Settings
  useEffect(() => {
    if (autoSend && initialEmail && !autoSendTriggered.current) {
      autoSendTriggered.current = true;
      handleSendOtp(initialEmail);
    }
  }, [autoSend, initialEmail, handleSendOtp]);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Step 1: Submit email to request OTP
  const onRequestSubmit = async (e) => {
    e.preventDefault();
    await handleSendOtp(email);
  };

  // Step 2: Submit OTP for verification
  const onVerifySubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.verifyOtp({
        email: email.trim(),
        otp: cleanOtp,
      });

      if (!res.reset_token) {
        throw new Error('Verification succeeded but reset token was not received.');
      }

      setResetToken(res.reset_token);
      setStep(3);
      showToast('Code verified! Please set your new password.', 'success');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.otp?.[0] ||
        'Invalid or expired verification code.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Submit new password using resetToken
  const onResetSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({
        reset_token: resetToken,
        password,
        confirm_password: confirmPassword,
      });

      // Clear all sensitive fields from memory
      setResetToken(null);
      setPassword('');
      setConfirmPassword('');
      setOtp('');

      showToast('Password updated successfully! Please sign in.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.password?.[0] ||
        'Password reset failed. Please try requesting a new OTP.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '460px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#f4f4f5',
              color: '#000000',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid #e4e4e7',
            }}
          >
            {step === 3 ? <Lock size={24} /> : <ShieldCheck size={26} />}
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000', margin: 0 }}>
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Verify Security Code'}
            {step === 3 && 'Create New Password'}
          </h1>

          <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.35rem', marginBottom: 0 }}>
            {step === 1 && 'Enter your email address to receive a 6-digit verification code.'}
            {step === 2 && `Enter the 6-digit code sent to ${email}`}
            {step === 3 && 'Choose a strong, secure new password for your account.'}
          </p>

          {/* Step Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: '32px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: s <= step ? '#000000' : '#e4e4e7',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              border: '1px solid #fecaca',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={onRequestSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Account Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: '6px', border: '1px solid #d4d4d8' }}
                />
                <Mail
                  size={18}
                  style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem', borderRadius: '6px' }}
            >
              {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* STEP 2: Verify 6-digit OTP */}
        {step === 2 && (
          <form onSubmit={onVerifySubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ border: 'none', background: 'none', color: '#71717a', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Change Email
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  autoFocus
                  className="form-input"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    letterSpacing: '6px',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                  }}
                />
                <Key
                  size={18}
                  style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem', borderRadius: '6px' }}
            >
              {isSubmitting ? 'Verifying Code...' : 'Verify Code'}
            </button>

            {/* Resend Cooldown Action */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              {resendCooldown > 0 ? (
                <span style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                  Resend code in <strong>{resendCooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSendOtp(email)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#000000',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Resend Code</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: Enter New Password */}
        {step === 3 && (
          <form onSubmit={onResetSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: '6px', border: '1px solid #d4d4d8' }}
                />
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: '6px', border: '1px solid #d4d4d8' }}
                />
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', borderRadius: '6px' }}
            >
              {isSubmitting ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link
            to={backDestination}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.875rem',
              color: '#71717a',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            <span>{backLabel}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
