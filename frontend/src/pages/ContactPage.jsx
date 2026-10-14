import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      showToast('Thank you! Your message has been received.', 'success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '4rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        {/* Header */}
        <AnimatedContent
          distance={50}
          direction="vertical"
          duration={0.85}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
          scale={0.98}
          delay={0.1}
        >
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h1
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                fontWeight: 800,
                color: '#000000',
                letterSpacing: '-0.025em',
                marginBottom: '0.75rem',
              }}
            >
              Contact Customer Support
            </h1>
            <p style={{ color: '#71717a', fontSize: '1rem', maxWidth: '520px', margin: '0 auto' }}>
              Have a question about an order, shipment, or product details? Our team is here to assist.
            </p>
          </div>
        </AnimatedContent>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '3.5rem', alignItems: 'start' }} className="contact-grid">
          {/* Contact Form */}
          <AnimatedContent
            distance={50}
            direction="vertical"
            duration={0.9}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
            scale={0.98}
            delay={0.15}
          >
            <div className="card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000000', marginBottom: '1.5rem' }}>
                Send a Message
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Your Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Jane Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="jane@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Order query, return request, etc."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    rows={4}
                    required
                    className="form-textarea"
                    placeholder="How can we help you?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', borderRadius: '6px' }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            </div>
          </AnimatedContent>

          {/* Contact Info Cards */}
          <AnimatedContent
            distance={50}
            direction="horizontal"
            reverse={false}
            duration={0.9}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
            scale={0.98}
            delay={0.25}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={18} color="#000" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#000000' }}>Email Us</h3>
                    <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '0.25rem 0' }}>Support responses within 24 hours</p>
                    <a href="mailto:support@djangomart.com" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                      support@djangomart.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={18} color="#000" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#000000' }}>Call Us</h3>
                    <p style={{ fontSize: '0.8125rem', color: '#71717a', margin: '0.25rem 0' }}>Mon - Fri: 9:00 AM - 6:00 PM</p>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                      +91 (0) 800-342-646
                    </span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={18} color="#000" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#000000' }}>Headquarters</h3>
                    <p style={{ fontSize: '0.8125rem', color: '#71717a', marginTop: '0.25rem', lineHeight: 1.5 }}>
                      DjangoMart Technology Center<br />
                      Bangalore, Karnataka, India
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactPage;
