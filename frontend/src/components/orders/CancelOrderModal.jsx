import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Loader2, Clock } from 'lucide-react';
import { getCancellationDeadlineInfo } from '../../utils/orderCancellation';

const COMMON_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery time is too long',
  'Need to change shipping address or items',
  'Other reason',
];

export const CancelOrderModal = ({
  isOpen,
  order,
  onClose,
  onConfirm,
  isSubmitting,
}) => {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(COMMON_REASONS[0]);
      setCustomReason('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !order) return null;

  const finalReason = selectedReason === 'Other reason' && customReason.trim()
    ? customReason.trim()
    : selectedReason;

  const handleConfirmClick = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    onConfirm(order.id, finalReason);
  };

  const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0)
    || order.items?.length
    || 1;

  const paymentDisplay = order.payment_method
    || (order.payment && order.payment.payment_method)
    || 'Cash on Delivery';

  const deadlineInfo = getCancellationDeadlineInfo(order);

  return (
    <div
      className="cancel-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        className="card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '480px',
          width: '100%',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e4e4e7',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
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

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2
              id="cancel-modal-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#18181b',
                margin: '0 0 0.25rem 0',
              }}
            >
              Cancel Order #{order.id}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#71717a', margin: 0 }}>
              Are you sure you want to cancel this order? This action cannot be reversed.
            </p>
          </div>
        </div>

        {/* 24-Hour Policy Window Notice */}
        {deadlineInfo && !deadlineInfo.isExpired && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              padding: '0.625rem 0.875rem',
              fontSize: '0.8125rem',
              color: '#166534',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={15} color="#16a34a" />
            <span>
              <strong>24-Hour Policy:</strong> {deadlineInfo.detail} ({deadlineInfo.remainingText} remaining)
            </span>
          </div>
        )}

        {/* Order Details Summary Box */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ color: '#64748b' }}>Order Total:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              ₹{Number(order.total_price || 0).toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ color: '#64748b' }}>Items:</span>
            <span style={{ fontWeight: 600, color: '#334155' }}>{itemCount} item(s)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Payment Method:</span>
            <span style={{ fontWeight: 600, color: '#334155' }}>{paymentDisplay}</span>
          </div>
        </div>

        {/* Restocked Stock Note & Refund Notice */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '0.75rem 0.875rem',
            fontSize: '0.8125rem',
            color: '#1e40af',
            marginBottom: '1.25rem',
            lineHeight: 1.5,
          }}
        >
          <div>Product inventory will be restored immediately, and any applied promo coupons will be released back to your account.</div>
          {(order.payment_status === 'SUCCESS' || order.payment?.payment_status === 'SUCCESS') && (
            <div style={{ marginTop: '0.375rem', fontWeight: 600, color: '#1d4ed8' }}>
              {paymentDisplay.includes('Cash on Delivery')
                ? 'A refund request will be logged for manual settlement.'
                : `A full refund of ₹${Number(order.total_price || 0).toFixed(2)} will be initiated to your original payment method.`}
            </div>
          )}
        </div>

        {/* Reason Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="cancellation-reason"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '0.5rem',
            }}
          >
            Reason for cancellation (optional):
          </label>
          <select
            id="cancellation-reason"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#111827',
              outline: 'none',
              marginBottom: selectedReason === 'Other reason' ? '0.75rem' : 0,
            }}
          >
            {COMMON_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>

          {selectedReason === 'Other reason' && (
            <textarea
              placeholder="Please specify your reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={isSubmitting}
              maxLength={250}
              rows={2}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                resize: 'none',
              }}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
            style={{
              fontSize: '0.875rem',
              padding: '0.625rem 1.25rem',
              fontWeight: 600,
            }}
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            className="btn btn-danger"
            style={{
              fontSize: '0.875rem',
              padding: '0.625rem 1.25rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              borderColor: '#dc2626',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Confirm Cancellation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
