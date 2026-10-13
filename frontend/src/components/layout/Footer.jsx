import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, ShoppingBag, ArrowRight } from 'lucide-react';

export const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        marginTop: 'auto',
      }}
    >
      {/* Value Badges Banner (Screenshot style) */}
      <div
        style={{
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#fafafa',
          padding: '2.5rem 0',
        }}
      >
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Truck size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#000000' }}>Free Shipping</div>
              <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                On orders over $50
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <RotateCcw size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#000000' }}>7 Days Return</div>
              <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                Easy & hassle-free returns
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#000000' }}>Secure Payment</div>
              <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                100% secure checkout
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CreditCard size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#000000' }}>Special Offers</div>
              <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                Save up to 50% on sales
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div style={{ padding: '4rem 0 3rem 0' }}>
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
            gap: '3rem',
          }}
        >
          {/* Brand Info */}
          <div>
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 800,
                fontSize: '1.35rem',
                color: '#000000',
                letterSpacing: '-0.025em',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  borderRadius: '6px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBag size={16} strokeWidth={2.2} />
              </div>
              <span>DjangoMart</span>
            </Link>
            <p style={{ color: '#71717a', fontSize: '0.875rem', lineHeight: '1.6', maxWidth: '340px' }}>
              Discover premium products curated with modern minimalism, uncompromising quality, and unbeatable prices.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
              Shop
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#52525b' }}>
              <Link to="/products" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>All Products</Link>
              <Link to="/products?category=all" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>Categories</Link>
              <Link to="/products?brand=all" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>Featured Brands</Link>
              <Link to="/wishlist" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>My Wishlist</Link>
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
              Help & Support
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#52525b' }}>
              <Link to="/orders" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>Track Order</Link>
              <Link to="/contact" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>Contact Us</Link>
              <Link to="/about" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>About DjangoMart</Link>
              <Link to="/privacy-policy" style={{ transition: 'color 150ms' }} onMouseEnter={(e) => e.target.style.color = '#000'} onMouseLeave={(e) => e.target.style.color = '#52525b'}>Privacy Policy</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
              Stay Updated
            </h4>
            <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
            </p>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                placeholder="Enter your email"
                className="form-input"
                style={{ fontSize: '0.8125rem' }}
                aria-label="Email for newsletter"
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.625rem 1rem' }}
                aria-label="Subscribe"
              >
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div
        style={{
          borderTop: '1px solid #f4f4f5',
          padding: '1.5rem 0',
          fontSize: '0.8125rem',
          color: '#a1a1aa',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>&copy; {new Date().getFullYear()} DjangoMart Inc. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/privacy-policy" style={{ color: '#71717a' }}>Privacy</Link>
            <Link to="/terms" style={{ color: '#71717a' }}>Terms</Link>
            <Link to="/shipping-policy" style={{ color: '#71717a' }}>Shipping</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
