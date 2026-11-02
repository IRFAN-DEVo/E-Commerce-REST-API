import React, { useEffect } from 'react';
import { Heart, X, Check } from 'lucide-react';

export const PendingWishlistConfirmModal = ({
  isOpen,
  productName,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, isLoading]);

  if (!isOpen) return null;

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
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-wishlist-modal-title"
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
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            color: '#71717a',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <X size={18} />
        </button>

        {/* Heart Icon Badge */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <Heart size={26} fill="#e11d48" />
        </div>

        {/* Title */}
        <h3
          id="pending-wishlist-modal-title"
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0a0a0a',
            margin: '0 0 0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Add to Your Wishlist?
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '0.875rem',
            color: '#52525b',
            lineHeight: 1.55,
            margin: '0 0 1.75rem',
          }}
        >
          Before signing in, you were viewing{' '}
          <strong style={{ color: '#09090b', fontWeight: 600 }}>
            {productName || 'this item'}
          </strong>
          . Would you like to add it to your wishlist collection now?
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              fontWeight: 700,
              fontSize: '0.875rem',
              borderRadius: '8px',
              backgroundColor: '#0a0a0a',
              color: '#ffffff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Check size={16} />
            <span>{isLoading ? 'Adding...' : 'Add to Wishlist'}</span>
          </button>

          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#52525b',
              border: '1px solid #e4e4e7',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            No, Thanks
          </button>
        </div>
      </div>
    </div>
  );
};

