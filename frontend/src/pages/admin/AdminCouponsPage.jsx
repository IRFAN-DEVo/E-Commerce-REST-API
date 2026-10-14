import React, { useState, useEffect } from 'react';
import { Percent, Plus, Trash2, X, CheckCircle, Clock } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('10');
  const [minOrder, setMinOrder] = useState('0');
  const [validDays, setValidDays] = useState('30');

  const { showToast } = useToast();

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getCoupons();
      setCoupons(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load store coupons.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !discountValue) {
      showToast('Please fill all required fields.', 'warning');
      return;
    }

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + Number(validDays || 30));

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: String(discountValue),
      minimum_order_amount: String(minOrder || 0),
      valid_from: now.toISOString(),
      valid_to: future.toISOString(),
      is_active: true,
    };

    setIsSubmitting(true);
    try {
      await adminApi.createCoupon(payload);
      showToast(`Coupon "${payload.code}" created successfully.`, 'success');
      setName('');
      setCode('');
      setDiscountValue('10');
      setMinOrder('0');
      setIsModalOpen(false);
      loadCoupons();
    } catch (err) {
      const msg =
        err.response?.data?.code?.[0] ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        'Failed to create coupon.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, couponCode) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${couponCode}"?`)) return;

    try {
      await adminApi.deleteCoupon(id);
      showToast(`Coupon "${couponCode}" deleted.`, 'info');
      loadCoupons();
    } catch (err) {
      showToast('Failed to delete coupon.', 'error');
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#000000', margin: 0 }}>
            Coupons &amp; Promotional Discounts
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Create discount coupon codes for promotions and marketing campaigns
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
        >
          <Plus size={16} />
          <span>Create Coupon</span>
        </button>
      </div>

      {isLoading && coupons.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <LoadingSpinner message="Loading promotion coupons..." />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--gray-50)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Coupon Code</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Campaign Name</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Discount</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Min. Order</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          backgroundColor: '#f4f4f5',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #e4e4e7',
                          color: '#000000',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {c.code}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#16a34a' }}>
                      {c.discount_type === 'PERCENTAGE'
                        ? `${Number(c.discount_value)}% OFF`
                        : `₹${Number(c.discount_value).toFixed(2)} OFF`}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>
                      ₹{Number(c.minimum_order_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: c.is_active ? '#f0fdf4' : '#fef2f2',
                          color: c.is_active ? '#16a34a' : '#dc2626',
                          border: c.is_active ? '1px solid #bbf7d0' : '1px solid #fecaca',
                        }}
                      >
                        {c.is_active ? 'Active' : 'Expired'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(c.id, c.code)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger-600)' }}
                        title="Delete Coupon"
                        aria-label={`Delete coupon ${c.code}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No active coupons found. Click "Create Coupon" to start a discount promotion.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', backgroundColor: '#ffffff', borderRadius: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Create New Coupon</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Summer Festival Sale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Coupon Code *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. SUMMER20, WELCOME10"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Discount Type
                  </label>
                  <select
                    className="form-select"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-control"
                    placeholder="e.g. 15"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Min. Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsPage;
