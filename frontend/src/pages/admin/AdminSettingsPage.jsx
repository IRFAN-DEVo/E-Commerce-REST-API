import React, { useState } from 'react';
import { Settings, Shield, CreditCard, Store, CheckCircle, Save, Database, Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AdminSettingsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState('DjangoMart');
  const [storeEmail, setStoreEmail] = useState('support@djangomart.com');
  const [currency, setCurrency] = useState('INR (₹)');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('500.00');
  const [isCodEnabled, setIsCodEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast('Store settings updated successfully.', 'success');
    }, 400);
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#000000', margin: 0 }}>
          Store &amp; System Settings
        </h1>
        <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem', marginBottom: 0 }}>
          Configure store parameters, payment gateway status, and security preferences
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }} className="admin-body-grid">
        {/* Left Column: Store Configuration Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* General Store Settings */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Store size={18} color="#000000" />
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>General Store Details</h2>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Store Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Support Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Active Currency
                  </label>
                  <select
                    className="form-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR (₹)">INR (₹ - Indian Rupee)</option>
                    <option value="USD ($)">USD ($ - US Dollar)</option>
                    <option value="EUR (€)">EUR (€ - Euro)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Free Shipping Threshold (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px' }}
                disabled={isSaving}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving...' : 'Save General Changes'}</span>
              </button>
            </form>
          </div>

          {/* Payment Gateways */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <CreditCard size={18} color="#000000" />
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>Payment Methods</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* COD */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#000000' }}>Cash On Delivery (COD)</div>
                  <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>Accept cash payment upon order delivery</div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  Active &bull; Primary
                </span>
              </div>

              {/* Online Gateways */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#000000' }}>Stripe / Razorpay</div>
                  <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>Online credit card, UPI, &amp; net banking</div>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    backgroundColor: '#f4f4f5',
                    color: '#71717a',
                    border: '1px solid #e4e4e7',
                  }}
                >
                  Disabled (Staging)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: System & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Admin Identity */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Shield size={18} color="#000000" />
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>Administrator Account</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#71717a' }}>Admin Email:</span>
                <span style={{ fontWeight: 600 }}>{user?.email || 'admin@djangomart.com'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#71717a' }}>Admin Role:</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>Superuser / Owner</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#71717a' }}>Auth Method:</span>
                <span style={{ fontWeight: 600 }}>JWT Bearer Token</span>
              </div>
            </div>
          </div>

          {/* System & Architecture Info */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Server size={18} color="#000000" />
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>System Environment</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#71717a' }}>Backend:</span>
                <span style={{ fontWeight: 600 }}>Django 5.x + DRF</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#71717a' }}>Frontend:</span>
                <span style={{ fontWeight: 600 }}>React 19 + Vite</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#71717a' }}>Database Engine:</span>
                <span style={{ fontWeight: 600 }}>SQLite / PostgreSQL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#71717a' }}>API Architecture:</span>
                <span style={{ fontWeight: 600 }}>REST API (v1)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
