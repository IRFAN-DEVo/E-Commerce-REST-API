import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const VerifyPhonePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isAuthenticated, refreshProfile } = useAuth();

  const initialPhone = location.state?.phone || user?.phone || '';
  const initialSessionToken = location.state?.session_token || '';
  const returnTo = location.state?.returnTo || '/profile?tab=settings';

  const [phone, setPhone] = useState(initialPhone);
  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [maskedPhone, setMaskedPhone] = useState(initialPhone ? `${initialPhone.slice(0, 3)} ****** ${initialPhone.slice(-4)}` : '');
  const [isOtpSent, setIsOtpSent] = useState(Boolean(location.state?.autoSend || initialPhone));

  // 6 individual digit inputs
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  // Focus first OTP input when code is sent
  useEffect(() => {
    if (isOtpSent && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isOtpSent]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Handle request/send OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone && !isAuthenticated) {
      setErrorMessage('Please enter a valid phone number with country code (e.g. +919876543210).');
      return;
    }

    setErrorMessage('');
    setIsSending(true);

    try {
      const payload = cleanPhone ? { phone: cleanPhone } : {};
      const res = await authApi.requestPhoneOtp(payload);

      if (res.session_token) {
        setSessionToken(res.session_token);
      }
      if (res.phone) {
        setMaskedPhone(res.phone);
      }
      setCooldown(res.cooldown_seconds || 60);
      setIsOtpSent(true);
      showToast('Verification code sent to your phone via SMS.', 'success');
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Failed to send verification SMS. Please check the phone number.';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.phone) {
        msg = Array.isArray(data.phone) ? data.phone[0] : data.phone;
      } else if (data?.detail) {
        msg = data.detail;
      }
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle keydown for digits, backspace, delete, and arrow navigation
  const handleKeyDown = (index, e) => {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const nextOtp = [...otp];
      nextOtp[index] = e.key;
      setOtp(nextOtp);
      setErrorMessage('');

      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const nextOtp = [...otp];
      if (otp[index]) {
        nextOtp[index] = '';
        setOtp(nextOtp);
      } else if (index > 0) {
        nextOtp[index - 1] = '';
        setOtp(nextOtp);
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      const nextOtp = [...otp];
      nextOtp[index] = '';
      setOtp(nextOtp);
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      return;
    }
  };

  // Handle input change & autofill
  const handleChange = (index, e) => {
    const raw = typeof e === 'string' ? e : e?.target?.value || '';
    const cleanDigits = raw.replace(/\D/g, '');
    if (!cleanDigits) {
      const nextOtp = [...otp];
      nextOtp[index] = '';
      setOtp(nextOtp);
      return;
    }

    if (cleanDigits.length === 6) {
      setOtp(cleanDigits.split(''));
      setErrorMessage('');
      inputRefs.current[5]?.focus();
      return;
    }

    if (cleanDigits.length > 1) {
      const nextOtp = [...otp];
      for (let i = 0; i < cleanDigits.length && index + i < 6; i++) {
        nextOtp[index + i] = cleanDigits[i];
      }
      setOtp(nextOtp);
      setErrorMessage('');
      const targetFocus = Math.min(index + cleanDigits.length, 5);
      inputRefs.current[targetFocus]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleanDigits;
    setOtp(nextOtp);
    setErrorMessage('');
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste complete 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
    const digits = pasted.replace(/\D/g, '').slice(0, 6);

    if (!digits) return;

    const nextOtp = [...otp];
    for (let i = 0; i < digits.length && i < 6; i++) {
      nextOtp[i] = digits[i];
    }
    setOtp(nextOtp);
    setErrorMessage('');
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // Handle OTP verification submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        otp: otpString,
      };
      if (phone) {
        payload.phone = phone;
      }
      if (sessionToken) {
        payload.session_token = sessionToken;
      }

      const res = await authApi.verifyPhoneOtp(payload);

      if (res.success || res.is_phone_verified) {
        setIsVerifiedSuccess(true);
        showToast('Phone number verified successfully!', 'success');

        if (isAuthenticated && typeof refreshProfile === 'function') {
          await refreshProfile();
        }

        setTimeout(() => {
          navigate(returnTo);
        }, 1800);
      }
    } catch (err) {
      const data = err.response?.data;
      let msg = 'Verification failed. Please check the OTP and try again.';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data?.otp) {
        msg = Array.isArray(data.otp) ? data.otp[0] : data.otp;
      }
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const payload = {};
      if (phone) payload.phone = phone;
      if (sessionToken) payload.session_token = sessionToken;

      const res = await authApi.resendPhoneOtp(payload);

      if (res.session_token) {
        setSessionToken(res.session_token);
      }
      setCooldown(res.cooldown_seconds || 60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      showToast('A new verification code has been dispatched.', 'success');
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.detail || 'Failed to resend code. Please try again shortly.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: '#71717a',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Success Screen State */}
        {isVerifiedSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#000000',
                marginBottom: '0.5rem',
                letterSpacing: '-0.025em',
              }}
            >
              Phone Verified!
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              Your phone number has been verified securely. Redirecting you shortly...
            </p>
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              Continue
            </button>
          </div>
        ) : (
          <div>
            {/* Header Icon & Title */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Phone size={26} />
              </div>

              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#000000',
                  letterSpacing: '-0.025em',
                  marginBottom: '0.5rem',
                }}
              >
                Verify Phone Number
              </h1>

              <p style={{ color: '#71717a', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {isOtpSent
                  ? `Enter the 6-digit verification code sent to ${maskedPhone || phone || 'your phone'}.`
                  : 'Enter your phone number to receive a secure 6-digit verification code via SMS.'}
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '0.8125rem',
                  marginBottom: '1.5rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ lineHeight: 1.4 }}>{errorMessage}</span>
              </div>
            )}

            {!isOtpSent ? (
              /* Phone Entry Form */
              <form onSubmit={handleRequestOtp}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    htmlFor="phone-input"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#18181b',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={isSending}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d4d4d8',
                      borderRadius: '8px',
                      fontSize: '0.9375rem',
                      color: '#000000',
                      outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.375rem' }}>
                    Include country code prefix (e.g. +91 for India).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    opacity: isSending ? 0.7 : 1,
                  }}
                >
                  {isSending ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              /* 6-Digit OTP Verification Form */
              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    marginBottom: '1.75rem',
                  }}
                  onPaste={handlePaste}
                >
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      aria-label={`Digit ${idx + 1}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(idx, e)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      disabled={isSubmitting}
                      style={{
                        width: '46px',
                        height: '52px',
                        textAlign: 'center',
                        fontSize: '1.35rem',
                        fontWeight: 700,
                        color: '#000000',
                        backgroundColor: '#fafafa',
                        border: digit ? '2px solid #000000' : '1px solid #d4d4d8',
                        borderRadius: '8px',
                        outline: 'none',
                        transition: 'border-color 150ms ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#000000';
                        e.target.style.backgroundColor = '#ffffff';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = digit ? '#000000' : '#d4d4d8';
                        e.target.style.backgroundColor = '#fafafa';
                      }}
                    />
                  ))}
                </div>

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || otp.join('').length !== 6}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    cursor: isSubmitting || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || otp.join('').length !== 6 ? 0.6 : 1,
                    marginBottom: '1.25rem',
                  }}
                >
                  {isSubmitting ? 'Verifying Code...' : 'Verify Phone Number'}
                </button>

                {/* Resend Cooldown & Controls */}
                <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                  {cooldown > 0 ? (
                    <span style={{ color: '#71717a' }}>
                      Resend code in <strong style={{ color: '#000000' }}>{cooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 600,
                        cursor: isResending ? 'not-allowed' : 'pointer',
                        padding: 0,
                      }}
                    >
                      <RefreshCw size={14} className={isResending ? 'spin' : ''} />
                      {isResending ? 'Resending...' : 'Resend Code'}
                    </button>
                  )}
                </div>

                {/* Change Phone Option */}
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtp(['', '', '', '', '', '']);
                      setErrorMessage('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#71717a',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Change phone number
                  </button>
                </div>
              </form>
            )}

            {/* Security Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #f4f4f5',
                color: '#71717a',
                fontSize: '0.75rem',
              }}
            >
              <ShieldCheck size={14} style={{ color: '#16a34a' }} />
              <span>Encrypted server-side OTP verification</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyPhonePage;
