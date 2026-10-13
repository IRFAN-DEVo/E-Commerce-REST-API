import React from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Shield, ShoppingBag, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>
        My Account Profile
      </h1>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={36} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{user.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span className="badge badge-processing">
                {user.user_type === 'owner' ? 'Shop Owner (Admin)' : 'Customer'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Mail size={18} color="var(--primary-600)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{user.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Phone size={18} color="var(--primary-600)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Phone</div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{user.phone || 'Not specified'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={18} color="var(--primary-600)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Member Since</div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
                {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={18} color="var(--primary-600)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authentication Mode</div>
              <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>JWT Bearer Token</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Link to="/orders" className="card card-interactive" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>Order History</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Track and manage orders</div>
          </div>
        </Link>

        <Link to="/wishlist" className="card card-interactive" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-50)', color: 'var(--danger-500)' }}>
            <Heart size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>My Wishlist</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Saved items</div>
          </div>
        </Link>
      </div>
    </div>
  );
};
