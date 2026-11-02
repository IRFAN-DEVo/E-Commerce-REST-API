import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Clock, CreditCard, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const RefundPolicyPage = () => {
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
              <RotateCcw size={16} />
              <span>Customer Satisfaction</span>
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
              Refund &amp; Cancellation Policy
            </h1>
            <p style={{ color: '#71717a', fontSize: '0.9375rem' }}>
              Clear, transparent guidelines for returns, refunds, and order cancellations
            </p>
          </div>
        </AnimatedContent>

        {/* Highlight Card */}
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
            At <strong>[BUSINESS_NAME]</strong>, we want you to shop with complete confidence.
            Below is our straightforward policy regarding order cancellations, returns, and refunds.
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', color: '#27272a', lineHeight: 1.7 }}>
          {/* Section 1 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Clock size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                1. 24-Hour Order Cancellation Window
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              You may request an immediate cancellation for any order within <strong>24 hours</strong> of placement, provided that:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>The order has not yet been marked as <strong>SHIPPED</strong> or dispatched with our logistics courier partner.</li>
              <li>You can initiate cancellation directly from your <Link to="/orders" style={{ color: '#000000', textDecoration: 'underline' }}>Orders History page</Link> or by contacting customer support.</li>
              <li>Once shipped, an order cannot be cancelled in transit and must be handled via our standard 7-day return procedure upon delivery.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <RotateCcw size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                2. 7-Day Return Window
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              We accept return requests initiated within <strong>7 calendar days</strong> from the delivery timestamp if:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>The item is defective, damaged in transit, or significantly different from description.</li>
              <li>The item is unused, unworn, unwashed, and in original brand packaging with all tags intact.</li>
              <li>An unboxing photograph or short video is provided when reporting transit damage.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <CreditCard size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                3. Refund Processing &amp; Timelines
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              Refunds are issued based on the payment method used for the initial purchase:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Online Payments (Credit/Debit Cards, UPI, Net Banking):</strong> Refunds are initiated automatically via Stripe or Razorpay back to your original payment method. Funds typically reflect in your account within <strong>5–7 business days</strong>, depending on your bank's clearance cycles.
              </li>
              <li>
                <strong>Cash on Delivery (COD):</strong> For returned COD orders, our support team will contact you to transfer the approved refund amount securely via NEFT/UPI after quality inspection.
              </li>
              <li>
                <strong>Coupons &amp; Discounts:</strong> Discount coupons are non-refundable in cash and will be credited back as store credit or single-use coupon if eligible.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                4. Non-Refundable &amp; Non-Returnable Items
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '0.75rem' }}>
              For health, safety, and hygiene standards, certain items are exempt from returns and refunds:
            </p>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9375rem', color: '#52525b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Intimate apparel, innerwear, and personal care accessories.</li>
              <li>Items explicitly marked as "Final Sale" or "Non-Returnable" on the product detail page.</li>
              <li>Items with broken seals or altered serial numbers/barcodes.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <HelpCircle size={20} color="#000000" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#000000' }}>
                5. How to Initiate a Return or Refund
              </h2>
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#52525b', marginBottom: '1rem' }}>
              To start a return or inquire about the status of a pending refund, contact our support team with your Order ID:
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
              <div><strong>Support Email:</strong> [SUPPORT_EMAIL]</div>
              <div><strong>Returns Support:</strong> [RETURNS_HOTLINE]</div>
              <div><strong>Operating Hours:</strong> Monday – Saturday, 9:00 AM – 6:00 PM IST</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;

