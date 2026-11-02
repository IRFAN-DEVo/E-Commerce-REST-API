import React from 'react';
import { Cookie, CheckCircle2, Sliders, ShieldCheck, Info } from 'lucide-react';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const CookiePolicyPage = () => {
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
              <Cookie size={16} />
              <span>Cookie Transparency</span>
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
              Cookie Policy
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.9375rem' }}>
              How [BUSINESS_NAME] uses cookies and local storage for security and functionality
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
            This Cookie Policy explains how <strong>[BUSINESS_NAME]</strong> ("we", "us", or "DjangoMart") uses cookies
            and browser storage technologies when you visit our online store. We are committed to minimal, strictly necessary data storage.
          </p>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', color: '#27272a', lineHeight: 1.7 }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Info size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                1. What Are Cookies &amp; Local Storage?
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b' }}>
              Cookies are small data files placed on your computer or mobile device when you visit a website. Modern web applications also use browser Local Storage to maintain high-performance, stateless client sessions and retain your shopping cart between visits.
            </p>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <ShieldCheck size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                2. Strictly Necessary / Essential Storage
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              These items are essential for the storefront to operate securely and cannot be switched off without breaking essential functionality:
            </p>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                overflow: 'hidden',
                fontSize: '0.875rem',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f4f4f5', borderBottom: '1px solid #e4e4e7' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Identifier</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Purpose</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>access_token</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Local Storage</td>
                    <td style={{ padding: '0.75rem 1rem' }}>JWT Bearer authentication for API requests</td>
                    <td style={{ padding: '0.75rem 1rem' }}>60 minutes</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>refresh_token</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Local Storage</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Secure renewal of expired access tokens</td>
                    <td style={{ padding: '0.75rem 1rem' }}>7 days</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>csrftoken</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Cookie (Lax)</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Prevents Cross-Site Request Forgery attacks</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Session / 1 year</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>djangomart_guest_cart</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Local Storage</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Preserves cart items for guest shoppers prior to login</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Persistent until cleared</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Sliders size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                3. Functional &amp; Preference Storage
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              We store your user interface preferences locally on your browser:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>djangomart_cookie_consent:</strong> Remembers your cookie preference acknowledgment so you are not prompted repeatedly.</li>
              <li><strong>admin_sidebar_collapsed:</strong> Remembers admin layout preferences on dashboard screens.</li>
            </ul>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <CheckCircle2 size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                4. Third-Party Advertising &amp; Tracking
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b' }}>
              <strong>We do NOT run invasive third-party behavioral ad trackers or cross-site tracking cookies.</strong> The only third parties that interact with your session are our secure payment providers (Stripe / Razorpay) during payment execution to verify transaction integrity and prevent card fraud.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem', color: '#000000' }}>
              5. How to Control or Delete Cookies
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '1rem' }}>
              You can instruct your browser to refuse all cookies or indicate when a cookie is being sent through your browser settings. Please note that disabling essential cookies or clearing local storage will log you out of your account and clear active shopping carts.
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
              <div><strong>Questions regarding cookies:</strong> [SUPPORT_EMAIL]</div>
              <div><strong>Business entity:</strong> [BUSINESS_NAME]</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;

