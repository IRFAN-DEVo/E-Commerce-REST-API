import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard } from 'lucide-react';

export const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid var(--border-color)',
        marginTop: 'auto',
      }}
    >
      {/* Value Badges Banner */}
      <div
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--gray-50)',
          padding: '2rem 0',
        }}
      >
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
              }}
            >
              <Truck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Fast Delivery</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Tracked shipment across India
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Genuine Products</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                100% verified authentic items
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
              }}
            >
              <RotateCcw size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Easy Returns</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Hassle-free 7-day returns
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
              }}
            >
              <CreditCard size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Flexible Payments</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Cash on Delivery supported
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container" style={{ padding: '3rem 1.5rem 2rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary-600)', marginBottom: '0.75rem' }}>
              DjangoMart
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '280px' }}>
              Your premium destination for electronics, fashion, and everyday essentials with reliable REST API ordering.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Shop & Explore</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <li><Link to="/products">All Products</Link></li>
              <li><Link to="/cart">Cart</Link></li>
              <li><Link to="/wishlist">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Customer Care</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <li><Link to="/orders">Order History</Link></li>
              <li><Link to="/profile">My Account</Link></li>
              <li><Link to="/notifications">Notifications</Link></li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>API & Architecture</div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Powered by Django 6.0, Django REST Framework 3.17, SimpleJWT, and React 19 SPA client.
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>&copy; {new Date().getFullYear()} DjangoMart. All rights reserved.</div>
          <div>Secure REST API Integration &bull; Cash on Delivery Enabled</div>
        </div>
      </div>
    </footer>
  );
};
