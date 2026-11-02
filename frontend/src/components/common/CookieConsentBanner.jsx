import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('djangomart_cookie_consent');
    if (!consent) {
      // Small delay for smooth entry
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice) => {
    localStorage.setItem('djangomart_cookie_consent', choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '1.25rem',
        right: '1.25rem',
        maxWidth: '520px',
        backgroundColor: '#18181b',
        color: '#ffffff',
        padding: '1.25rem',
        borderRadius: '14px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        border: '1px solid #27272a',
        animation: 'slideUpBanner 300ms ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
        <div
          style={{
            backgroundColor: '#27272a',
            padding: '0.5rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Cookie size={20} color="#f4f4f5" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#ffffff' }}>
              We value your privacy
            </h4>
            <button
              onClick={() => handleConsent('essential')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: '#a1a1aa', lineHeight: 1.5 }}>
            DjangoMart uses essential cookies to ensure secure authentication, cart persistence, and fraud prevention.{' '}
            <Link
              to="/cookie-policy"
              style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 500 }}
            >
              Learn more in our Cookie Policy
            </Link>.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleConsent('accepted')}
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 150ms',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e4e4e7')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              Accept All
            </button>
            <button
              onClick={() => handleConsent('essential')}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1px solid #3f3f46',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 150ms',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#27272a')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Essential Only
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUpBanner {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CookieConsentBanner;

