import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Tag, AlertCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ordersApi } from '../api/orders';
import { couponsApi } from '../api/coupons';
import { paymentsApi } from '../api/payments';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const CheckoutPage = () => {
  const { cartItems, totalPrice, clearCartState } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Shipping Form State
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  // Flow State
  const [createdOrder, setCreatedOrder] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleShippingChange = (e) => {
    setShippingAddress({ ...shippingAddress, [e.target.name]: e.target.value });
  };

  // Step 1: Create Order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast('Your cart is empty.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await ordersApi.checkout(shippingAddress);
      setCreatedOrder(order);
      clearCartState();
      showToast('Order created! Please review details and select payment.', 'success');
    } catch (err) {
      const respData = err.response?.data;
      let msg = 'Failed to create order. Please verify items and stock.';
      if (typeof respData === 'string') {
        msg = respData;
      } else if (respData?.detail) {
        msg = respData.detail;
      } else if (respData?.error) {
        msg = respData.error;
      } else if (Array.isArray(respData)) {
        msg = respData[0];
      } else if (respData?.shipping_address) {
        msg = Array.isArray(respData.shipping_address)
          ? respData.shipping_address[0]
          : typeof respData.shipping_address === 'object'
          ? Object.values(respData.shipping_address).flat()[0]
          : String(respData.shipping_address);
      } else if (respData && typeof respData === 'object') {
        const firstVal = Object.values(respData)[0];
        msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Apply Coupon
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!createdOrder) return;
    if (!couponCode.trim()) {
      showToast('Please enter a coupon code.', 'warning');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const res = await couponsApi.applyCoupon(createdOrder.id, couponCode.trim());
      setAppliedCoupon(res);
      // Update order total locally based on server response
      setCreatedOrder((prev) => ({
        ...prev,
        total_price: res.final_total,
      }));
      showToast(`Coupon ${res.coupon} applied! Saved ₹${Number(res.discount).toFixed(2)}`, 'success');
    } catch (err) {
      const respData = err.response?.data;
      const msg =
        respData?.detail ||
        respData?.error ||
        (Array.isArray(respData) ? respData[0] : null) ||
        respData?.non_field_errors?.[0] ||
        'Invalid or expired coupon.';
      showToast(msg, 'error');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Step 3: Complete Payment & Place Order
  const handleConfirmPayment = async () => {
    if (!createdOrder) return;

    if (paymentMethod !== 'COD') {
      showToast('Only Cash on Delivery is currently supported in this store.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentsApi.createPayment(createdOrder.id, 'COD');
      showToast('Order placed successfully via Cash on Delivery!', 'success');
      navigate(`/orders/${createdOrder.id}`);
    } catch (err) {
      const respData = err.response?.data;
      const msg =
        respData?.detail ||
        respData?.error ||
        (Array.isArray(respData) ? respData[0] : null) ||
        'Payment initiation failed.';
      showToast(msg, 'error');
      setIsSubmitting(false);
    }
  };

  if (!createdOrder && cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <ShoppingBag size={48} color="var(--primary-600)" style={{ margin: '0 auto 1rem' }} />
        <h2>Your cart is empty</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>
        {createdOrder ? `Checkout — Order #${createdOrder.id}` : 'Secure Checkout'}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.6fr) minmax(280px, 1fr)',
          gap: '2.5rem',
          alignItems: 'start',
        }}
        className="checkout-layout"
      >
        {/* Main Column */}
        <div>
          {!createdOrder ? (
            /* Shipping Address Form */
            <div className="card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                1. Delivery Shipping Address
              </h2>

              <form onSubmit={handleCreateOrder}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="full_name" className="form-label">Full Name *</label>
                    <input
                      id="full_name"
                      type="text"
                      name="full_name"
                      required
                      className="form-input"
                      value={shippingAddress.full_name}
                      onChange={handleShippingChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Contact Phone *</label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      required
                      className="form-input"
                      placeholder="10-digit mobile number"
                      value={shippingAddress.phone}
                      onChange={handleShippingChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address" className="form-label">Street Address *</label>
                  <textarea
                    id="address"
                    name="address"
                    required
                    rows={2}
                    className="form-textarea"
                    placeholder="House/Flat number, Building name, Street"
                    value={shippingAddress.address}
                    onChange={handleShippingChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">City *</label>
                    <input
                      id="city"
                      type="text"
                      name="city"
                      required
                      className="form-input"
                      value={shippingAddress.city}
                      onChange={handleShippingChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state" className="form-label">State *</label>
                    <input
                      id="state"
                      type="text"
                      name="state"
                      required
                      className="form-input"
                      value={shippingAddress.state}
                      onChange={handleShippingChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="postal_code" className="form-label">Postal Code *</label>
                    <input
                      id="postal_code"
                      type="text"
                      name="postal_code"
                      required
                      className="form-input"
                      value={shippingAddress.postal_code}
                      onChange={handleShippingChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="country" className="form-label">Country</label>
                  <input
                    id="country"
                    type="text"
                    name="country"
                    disabled
                    className="form-input"
                    value={shippingAddress.country}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {isSubmitting ? 'Creating Order...' : 'Confirm Shipping & Continue'}
                </button>
              </form>
            </div>
          ) : (
            /* Payment & Coupon Section after Order Creation */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Order Created Success Notice */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--success-50)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: 'var(--success-600)',
                }}
              >
                <CheckCircle2 size={20} />
                <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                  Order <strong>#{createdOrder.id}</strong> reserved. Please apply any coupon and confirm payment.
                </span>
              </div>

              {/* Coupon Section */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Tag size={18} color="var(--primary-600)" />
                  <span>Have a Promo Code or Coupon?</span>
                </h3>

                {appliedCoupon ? (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--primary-50)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--primary-700)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    Coupon &ldquo;{appliedCoupon.coupon}&rdquo; applied: -₹{Number(appliedCoupon.discount).toFixed(2)} discount!
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter coupon code (e.g. TEST20)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase' }}
                    />
                    <button type="submit" disabled={isApplyingCoupon} className="btn btn-secondary">
                      {isApplyingCoupon ? 'Applying...' : 'Apply'}
                    </button>
                  </form>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                  2. Choose Payment Method
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* COD Option */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem',
                      border: '2px solid var(--primary-600)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-50)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      style={{ marginTop: '0.25rem' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        Cash on Delivery (COD) — Verified & Active
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Pay cash upon receiving your shipment at your delivery doorstep.
                      </div>
                    </div>
                  </label>

                  {/* Razorpay & Stripe Mock Notice (Disabled per project requirements) */}
                  <div
                    style={{
                      padding: '1rem',
                      border: '1px dashed var(--gray-300)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--gray-50)',
                      opacity: 0.7,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <AlertCircle size={16} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Razorpay & Stripe (Online Gateways — Staging Mock)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Online payment SDKs are not connected with live banking APIs. Use Cash on Delivery to finalize real orders.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '1.5rem' }}
                >
                  {isSubmitting ? 'Confirming Order...' : `Place Order (₹${Number(createdOrder.total_price).toFixed(2)})`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Column */}
        <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '5.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
            Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Items Total</span>
              <span>₹{Number(totalPrice).toFixed(2)}</span>
            </div>

            {appliedCoupon && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-600)', fontWeight: 600 }}>
                <span>Coupon ({appliedCoupon.coupon})</span>
                <span>-₹{Number(appliedCoupon.discount).toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Delivery</span>
              <span style={{ color: 'var(--success-600)', fontWeight: 600 }}>FREE</span>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem',
                marginTop: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.25rem',
                fontWeight: 800,
              }}
            >
              <span>Payable Total</span>
              <span>
                ₹{Number(createdOrder ? createdOrder.total_price : totalPrice).toFixed(2)}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <ShieldCheck size={16} color="var(--success-600)" />
            <span>Server-computed pricing & atomic transaction safety</span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .checkout-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
