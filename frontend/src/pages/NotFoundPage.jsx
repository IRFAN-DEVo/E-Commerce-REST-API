import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div
      className="container"
      style={{
        padding: '6rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
      }}
    >
      <div style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--primary-600)', lineHeight: 1 }}>
        404
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '440px' }}>
        The page you are looking for may have been moved, deleted, or does not exist.
      </p>
      <Link to="/" className="btn btn-primary btn-lg" style={{ marginTop: '0.5rem' }}>
        <Home size={18} />
        <span>Return to Homepage</span>
      </Link>
    </div>
  );
};
