import React from 'react';

export const LoadingSpinner = ({ size = 32, message = 'Loading...' }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
      gap: '1rem',
    }}
  >
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid var(--gray-200)',
        borderTopColor: 'var(--primary-600)',
        borderRadius: '50%',
        animation: 'spin 700ms linear infinite',
      }}
    />
    {message && (
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
        {message}
      </span>
    )}
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export const ProductCardSkeleton = () => (
  <div className="card" style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
    <div style={{ flex: 1, backgroundColor: 'var(--gray-200)', animation: 'pulse 1.5s infinite' }} />
    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ height: '16px', width: '60%', backgroundColor: 'var(--gray-200)', borderRadius: '4px' }} />
      <div style={{ height: '20px', width: '90%', backgroundColor: 'var(--gray-200)', borderRadius: '4px' }} />
      <div style={{ height: '24px', width: '40%', backgroundColor: 'var(--gray-200)', borderRadius: '4px' }} />
    </div>
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
  </div>
);
