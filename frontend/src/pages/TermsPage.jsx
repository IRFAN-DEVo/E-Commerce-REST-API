import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, AlertCircle, Scale, ShieldAlert, HelpCircle } from 'lucide-react';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const TermsPage = () => {
  return (
    <div style={{ backgroundColor: '#ffffff', padding: '3.5rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '840px' }}>
        {/* Header */}
        <AnimatedContent distance={40} direction="vertical" duration={0.7} initialOpacity={0} animateOpacity>
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
              <FileText size={16} />
              <span>Legal Agreement</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.25rem, 4vw, 3rem)',
                fontWeight: 800,
                color: '#000000',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '1rem',
              }}
            >
              Terms of Service
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.9375rem' }}>
              Last Updated: November 2026 &bull; Please read carefully before purchasing
            </p>
          </div>
        </AnimatedContent>

        {/* Intro */}
        <div
          style={{
            backgroundColor: '#fafafa',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: '#3f3f46' }}>
            Welcome to DjangoMart! These Terms of Service ("Terms") govern your access to and use of the website,
            mobile interface, services, and applications offered by <strong>[BUSINESS_NAME]</strong> ("we", "us", or "our").
            By registering an account, browsing, or placing an order, you agree to be bound by these Terms.
          </p>
        </div>

        {/* Terms Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', color: '#27272a', lineHeight: 1.7 }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <CheckCircle2 size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                1. Account Registration &amp; Security
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              To place orders and access certain features such as your wishlist and order tracking, you may be required to register an account. You agree to:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Maintain the confidentiality of your login credentials and passwords.</li>
              <li>Promptly notify us of any suspected unauthorized access or security breach.</li>
              <li>Accept responsibility for all activities conducted under your authenticated account.</li>
            </ul>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <AlertCircle size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                2. Products, Pricing &amp; Inventory
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              We make every effort to display accurate product images, specifications, and prices. However:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Prices are shown in Indian Rupees (₹ INR) inclusive of applicable taxes unless stated otherwise.</li>
              <li>We reserve the right to correct pricing or typographical errors before order dispatch. In the event of a material pricing discrepancy, we will notify you and offer the option to confirm or cancel the order.</li>
              <li>Product availability is subject to stock at the time of order confirmation.</li>
            </ul>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Scale size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                3. Orders, Payments &amp; Cancellations
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              All orders placed on DjangoMart constitute an offer to purchase:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Payment Methods:</strong> We accept online credit/debit cards, UPI, net banking (via Stripe/Razorpay), and Cash on Delivery (COD) for eligible pin codes.
              </li>
              <li>
                <strong>Order Cancellation:</strong> You may cancel eligible orders within 24 hours of placement provided the order has not been dispatched. Refer to our <Link to="/refund-policy" style={{ color: '#000000', textDecoration: 'underline' }}>Refund Policy</Link> for comprehensive details.
              </li>
              <li>
                <strong>Fraud Prevention:</strong> We reserve the right to cancel suspicious orders or orders flagged by our automated risk filters.
              </li>
            </ul>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <ShieldAlert size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                4. Limitation of Liability
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b' }}>
              To the fullest extent permitted by applicable law, <strong>[BUSINESS_NAME]</strong> and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from your access to or inability to use our services. In all events, our total aggregate liability shall not exceed the amount actually paid by you for the specific transaction giving rise to the claim.
            </p>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <HelpCircle size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                5. Governing Law &amp; Jurisdiction
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '1rem' }}>
              These Terms of Service and any separate agreements shall be governed by and construed in accordance with the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in <strong>[REGISTERED_CITY, STATE]</strong>, India.
            </p>
            <div
              style={{
                backgroundColor: '#fafafa',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '1.25rem',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: '#3f3f46',
              }}
            >
              <div><strong>Company Name:</strong> [BUSINESS_NAME]</div>
              <div><strong>Registration / CIN:</strong> [BUSINESS_REGISTRATION_NUMBER]</div>
              <div><strong>Legal Queries:</strong> [SUPPORT_EMAIL]</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;

