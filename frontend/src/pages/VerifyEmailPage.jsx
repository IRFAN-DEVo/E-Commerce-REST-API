import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MailCheck, Mail, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const initialEmail = location.state?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);

  // 6 individual digit inputs
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  // Focus the first input box on load if email is known
  useEffect(() => {
    if (email && !isEditingEmail && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [email, isEditingEmail]);

  // Cooldown countdown timer (30 seconds)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const otpString = otp.join('');

  // Handle single digit input
  const handleChange = (index, value) => {
    const char = value.slice(-1);

    // Reject non-numeric characters
    if (char && !/^\d$/.test(char)) {
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = char;
    setOtp(nextOtp);
    setErrorMessage('');

    // Advance focus to next input if digit entered
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keydown for backspace and navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous box if current is empty
        const nextOtp = [...otp];
        nextOtp[index - 1] = '';
        setOtp(nextOtp);
        inputRefs.current[index - 1]?.focus();
      } else if (otp[index]) {
        // Clear current box
        const nextOtp = [...otp];
        nextOtp[index] = '';
        setOtp(nextOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste complete 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    const digits = pasted.replace(/\D/g, '').slice(0, 6);

    if (!digits) return;

    const nextOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      nextOtp[i] = digits[i] || '';
    }
    setOtp(nextOtp);
    setErrorMessage('');

    const targetFocusIndex = Math.min(digits.length, 5);
    inputRefs.current[targetFocusIndex]?.focus();
  };

  // Submit verification to backend
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please provide your registered email address.');
      setIsEditingEmail(true);
      return;
    }

    if (otpString.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.verifyEmail({
        email: cleanEmail,
        otp: otpString,
      });

      setIsVerifiedSuccess(true);
      showToast('Email verified successfully! Welcome to DjangoMart.', 'success');

      // If backend returned JWT credentials, log in automatically
      if (response?.access) {
        localStorage.setItem('access_token', response.access);
        if (response.refresh) {
          localStorage.setItem('refresh_token', response.refresh);
        }
        if (response.user) {
          localStorage.setItem('user_info', JSON.stringify(response.user));
        }
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      } else {
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1200);
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.otp?.[0] ||
        'Verification failed. The code may be invalid or expired.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to receive a code.');
      setIsEditingEmail(true);
      return;
    }

    setIsResending(true);
    setErrorMessage('');

    try {
      await authApi.resendVerificationOtp({ email: cleanEmail });
      showToast('A new 6-digit verification code has been sent to your email.', 'success');
      setCooldown(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Failed to resend verification code. Please try again shortly.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '460px' }}>
      <div
        className="card"
        style={{
          padding: '2.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e4e4e7',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
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
            {isVerifiedSuccess ? (
              <CheckCircle2 size={26} style={{ color: '#16a34a' }} />
            ) : (
              <MailCheck size={26} />
            )}
          </div>

          <h1
            style={{
              fontSize: '1.625rem',
              fontWeight: 700,
              color: '#000000',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Verify Your Email
          </h1>

          <p
            style={{
              fontSize: '0.875rem',
              color: '#71717a',
              marginTop: '0.45rem',
              lineHeight: 1.5,
              marginBottom: 0,
            }}
          >
            Enter the 6-digit verification code we sent to your email address.
          </p>

          {/* Email badge / edit toggle */}
          {email && !isEditingEmail ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #e4e4e7',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                marginTop: '0.85rem',
              }}
            >
              <Mail size={13} style={{ color: '#71717a' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000' }}>
                {email}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#71717a',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  marginLeft: '0.25rem',
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '0.85rem' }}>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  width: '100%',
                  maxWidth: '280px',
                  textAlign: 'center',
                }}
              />
            </div>
          )}
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              border: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 6-Digit OTP Input Form */}
        <form onSubmit={handleVerify}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
            }}
          >
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={1}
                aria-label={`Digit ${idx + 1}`}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                style={{
                  width: '48px',
                  height: '56px',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  color: '#000000',
                  borderRadius: '8px',
                  border: digit ? '1.5px solid #000000' : '1.5px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  fontFamily: 'monospace',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#000000';
                  e.target.style.boxShadow = '0 0 0 1px #000000';
                }}
                onBlur={(e) => {
                  if (!digit) {
                    e.target.style.borderColor = '#d4d4d8';
                  }
                  e.target.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>

          {/* Resend OTP text & cooldown */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#71717a',
              marginBottom: '1.75rem',
            }}
          >
            <span>Didn't receive the code? </span>
            {cooldown > 0 ? (
              <span>
                Resend code in <strong style={{ color: '#000000' }}>{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#000000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: '0.875rem',
                }}
              >
                {isResending ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={isSubmitting || otpString.length !== 6 || isVerifiedSuccess}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              borderRadius: '6px',
              backgroundColor: '#000000',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            {isSubmitting
              ? 'Verifying...'
              : isVerifiedSuccess
              ? 'Verified!'
              : 'Verify Email'}
          </button>
        </form>

        {/* Footer links */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #f4f4f5',
            fontSize: '0.8125rem',
          }}
        >
          <Link
            to="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#71717a',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to registration</span>
          </Link>

          <Link
            to="/login"
            style={{
              color: '#71717a',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
