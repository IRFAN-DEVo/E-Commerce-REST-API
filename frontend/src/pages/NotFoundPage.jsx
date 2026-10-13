import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5rem 1.5rem',
      }}
    >
      <div
        className="container"
        style={{
          textAlign: 'center',
          maxWidth: '560px',
        }}
      >
        {/* Bold 404 (Screenshot #8) */}
        <div
          style={{
            fontSize: 'clamp(5rem, 12vw, 8.5rem)',
            fontWeight: 900,
            color: '#000000',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            marginBottom: '1rem',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: '#000000',
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem',
          }}
        >
          Page Not Found
        </h1>

        <p
          style={{
            color: '#71717a',
            fontSize: '1rem',
            lineHeight: 1.6,
            marginBottom: '2.5rem',
          }}
        >
          The page you are looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/"
          className="btn btn-primary btn-lg"
          style={{
            padding: '0.8125rem 2.25rem',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
};
export default NotFoundPage;
