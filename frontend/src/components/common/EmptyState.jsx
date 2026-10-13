import React from 'react';
import { Link } from 'react-router-dom';
import { PackageOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  actionText,
  actionLink,
  onAction,
}) => (
  <div
    className="card"
    style={{
      textAlign: 'center',
      padding: '3.5rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      backgroundColor: '#ffffff',
    }}
  >
    <div
      style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-50)',
        color: 'var(--primary-600)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={32} />
    </div>
    <div style={{ maxWidth: '420px' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
    {actionText && actionLink && (
      <Link to={actionLink} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        {actionText}
      </Link>
    )}
    {actionText && onAction && !actionLink && (
      <button onClick={onAction} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        {actionText}
      </button>
    )}
  </div>
);
