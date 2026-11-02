import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, Trash2, Database, Mail } from 'lucide-react';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const PrivacyPolicyPage = () => {
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
              <ShieldCheck size={16} />
              <span>Trust & Transparency</span>
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
              Privacy Policy
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.9375rem' }}>
              Last Updated: November 2026 &bull; Effective Immediately
            </p>
          </div>
        </AnimatedContent>

        {/* Notice Box */}
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
            <strong>[BUSINESS_NAME]</strong> ("DjangoMart", "we", "our", or "us") respects your privacy and is committed
            to protecting the personal data you share with us. This Privacy Policy describes how we collect, store,
            protect, and process your information when you visit our website or make a purchase.
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', color: '#27272a', lineHeight: 1.7 }}>
          {/* Section 1 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Eye size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                1. Information We Collect
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              We collect information that you directly provide to us and data gathered automatically:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Identity & Contact Details:</strong> Name, email address, mobile phone number, and delivery shipping addresses provided during registration or checkout.
              </li>
              <li>
                <strong>Authentication Credentials:</strong> Password hashes (securely salted using Argon2/PBKDF2; plaintext passwords are never stored) or Google OAuth tokens.
              </li>
              <li>
                <strong>Transaction & Order History:</strong> Records of products purchased, order values, delivery status, and timestamps.
              </li>
              <li>
                <strong>Technical & Usage Data:</strong> IP address, device type, browser specifications, and session identifiers collected automatically for security logging.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Lock size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                2. Payment Information Security
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b' }}>
              We <strong>never</strong> store, process, or transmit full credit/debit card numbers or CVVs on our servers. All online card transactions are handled directly by PCI-DSS Level 1 compliant payment gateways (Stripe and Razorpay). When you pay online, your payment information is encrypted and transmitted directly to the authorized gateway provider.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Database size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                3. Third-Party Data Sharing
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              We never sell or rent your personal information to third parties. We only share necessary data with trusted service providers strictly to fulfill our obligations:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Payment Processors:</strong> Stripe &amp; Razorpay (payment processing and fraud detection).</li>
              <li><strong>Authentication Providers:</strong> Google Identity Services (optional Single Sign-On).</li>
              <li><strong>Communications:</strong> SMTP email and SMS gateway providers for order confirmation receipts and OTP verification.</li>
              <li><strong>Legal Authorities:</strong> Only when strictly required by enforceable subpoena, court order, or applicable Indian laws.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Trash2 size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                4. Data Retention &amp; Right to Erasure
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              In accordance with data protection principles (including GDPR and Indian DPDP Act guidelines), you have full control over your personal data:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Right to Erasure (Account Deletion):</strong> You may request full account deletion at any time directly through your <Link to="/profile" style={{ color: '#000000', textDecoration: 'underline' }}>Account Settings</Link> or by contacting our Data Protection Officer.
              </li>
              <li>
                <strong>Immediate Data Purge:</strong> Deleting your account immediately wipes your active sessions, empty cart items, wishlist items, saved addresses, and active notifications.
              </li>
              <li>
                <strong>Statutory Financial Records:</strong> Historical orders and invoices are retained in an anonymized format for a mandatory period of 7 years strictly to satisfy statutory tax, auditing, and corporate accounting requirements.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Mail size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                5. Contact &amp; Grievance Officer
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '1rem' }}>
              If you have any questions, grievances, or requests regarding this Privacy Policy or your personal information, please reach out to our designated compliance contact:
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
              <div><strong>Business Entity:</strong> [BUSINESS_NAME]</div>
              <div><strong>Registered Address:</strong> [REGISTERED_ADDRESS]</div>
              <div><strong>Support Email:</strong> [SUPPORT_EMAIL]</div>
              <div><strong>Grievance / Privacy Officer:</strong> [DATA_PROTECTION_OFFICER_EMAIL]</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

