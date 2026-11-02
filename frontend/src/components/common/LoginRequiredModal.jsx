import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, X, LogIn, UserPlus } from 'lucide-react';

export const LoginRequiredModal = ({
  isOpen,
  onClose,
  product = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginClick = () => {
    onClose();
    navigate('/login', {
      state: {
        from: location,
        pendingWishlistProductId: product?.id || null,
      },
    });
  };

  const handleRegisterClick = () => {
    onClose();
    navigate('/register', {
      state: {
        from: location,
        pendingWishlistProductId: product?.id || null,
      },
    });
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-modal-title"
        className="card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '420px',
          width: '100%',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          padding: 'clamp(1.25rem, 4vw, 2rem) 1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e4e4e7',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#71717a',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
        >
          <X size={18} />
        </button>

        {/* Heart Icon Badge */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#ffe4e6',
            color: '#e11d48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <Heart size={24} fill="#e11d48" />
        </div>

        {/* Modal Title & Message */}
        <h2
          id="login-required-modal-title"
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#18181b',
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
          }}
        >
          Login Required
        </h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#71717a',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
          }}
        >
          Please log in to your DjangoMart account to add products to your wishlist.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <button
            onClick={handleLoginClick}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <LogIn size={16} />
            <span>Login</span>
          </button>

          <button
            onClick={handleRegisterClick}
            className="btn btn-secondary btn-lg"
            style={{
              width: '100%',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;

