import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, Truck, Award, Users } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div style={{ backgroundColor: '#ffffff', padding: '4rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '840px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f4f4f5',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#000000',
              marginBottom: '1rem',
            }}
          >
            <span>Our Philosophy</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
              fontWeight: 800,
              color: '#000000',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
            }}
          >
            Modern Style For Everyday Life
          </h1>

          <p style={{ color: '#52525b', fontSize: '1.125rem', lineHeight: 1.6 }}>
            DjangoMart was built on a simple premise: everyday essentials shouldn't compromise on design, longevity, or trust.
          </p>
        </div>

        {/* Story Section */}
        <div style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '3rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '1rem', color: '#3f3f46', lineHeight: 1.8 }}>
          <p>
            We curate and engineer everyday apparel, technology, and home goods with minimalist aesthetics and uncompromising quality standards. Every product in our catalog undergoes rigorous authenticity and quality testing before reaching your hands.
          </p>
          <p>
            By integrating Django's battle-tested security with an instantaneous React single-page interface, we deliver an e-commerce experience that is fast, resilient, and transparent at every checkout step.
          </p>
        </div>

        {/* 3 Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '3.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000000', marginBottom: '0.5rem' }}>100% Authentic</h3>
            <p style={{ fontSize: '0.875rem', color: '#71717a', lineHeight: 1.5 }}>Direct relationships with verified brands and manufacturers.</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Truck size={22} />
            </div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000000', marginBottom: '0.5rem' }}>Fast Dispatch</h3>
            <p style={{ fontSize: '0.875rem', color: '#71717a', lineHeight: 1.5 }}>Tracked door-to-door delivery with real-time status alerts.</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000000', marginBottom: '0.5rem' }}>Customer First</h3>
            <p style={{ fontSize: '0.875rem', color: '#71717a', lineHeight: 1.5 }}>7-day hassle-free returns and dedicated support team.</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <Link to="/products" className="btn btn-primary btn-lg" style={{ borderRadius: '9999px', padding: '0.875rem 2.25rem' }}>
            Explore Our Catalog
          </Link>
        </div>
      </div>
    </div>
  );
};
export default AboutPage;
