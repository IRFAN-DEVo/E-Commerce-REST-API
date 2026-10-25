import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Tag, AlertCircle, ShoppingBag, Lock, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ordersApi } from '../api/orders';
import { couponsApi } from '../api/coupons';
import { paymentsApi } from '../api/payments';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if (window.Razorpay) {
        resolve(true);
      } else {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        setTimeout(() => resolve(Boolean(window.Razorpay)), 1500);
      }
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
    setTimeout(() => resolve(Boolean(window.Razorpay)), 1500);
  });
};

export const resolveRazorpayAmountPaise = (paymentInitData) => {
  if (!paymentInitData) return null;

  // 1. Prefer authoritative integer amount_paise when available
  if (
    paymentInitData.amount_paise !== undefined &&
    paymentInitData.amount_paise !== null
  ) {
    const paiseVal = Number(paymentInitData.amount_paise);
    if (Number.isInteger(paiseVal) && paiseVal > 0) {
      return paiseVal;
    }
  }

  // 2. Otherwise calculate paise safely from rupee amount (e.g. "3009.69" -> 300969)
  const rawAmount = paymentInitData.amount;
  if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
    if (typeof rawAmount === 'string') {
      const trimmed = rawAmount.trim();
      const parts = trimmed.split('.');
      if (parts.length === 1 && /^\d+$/.test(parts[0])) {
        const wholeRupees = parseInt(parts[0], 10);
        if (wholeRupees > 0) return wholeRupees * 100;
      } else if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        const wholeRupees = parseInt(parts[0], 10);
        const fraction = parts[1].slice(0, 2).padEnd(2, '0');
        const paise = wholeRupees * 100 + parseInt(fraction, 10);
        if (paise > 0) return paise;
      }
    }
    const num = Number(rawAmount);
    if (Number.isFinite(num) && num > 0) {
      const paise = Math.round(num * 100);
      if (Number.isInteger(paise) && paise > 0) {
        return paise;
      }
    }
  }

  return null;
};


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
  const [paymentConfig, setPaymentConfig] = useState({
    razorpay_enabled: false,
    razorpay_key_id: '',
    cod_enabled: true,
    stripe_enabled: false,
  });

  useEffect(() => {
    let mounted = true;
    if (typeof paymentsApi?.getPaymentConfig === 'function') {
      Promise.resolve(paymentsApi.getPaymentConfig())
        .then((cfg) => {
          if (mounted && cfg) {
            setPaymentConfig(cfg);
          }
        })
        .catch(() => {
          // Fallback safely to default COD configuration
        });
    }
    return () => {
      mounted = false;
    };
  }, []);



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

    if (paymentMethod === 'COD') {
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
      return;
    }

    if (paymentMethod === 'RAZORPAY') {
      setIsSubmitting(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        showToast('Unable to load Razorpay payment SDK. Please check your internet connection.', 'error');
        setIsSubmitting(false);
        return;
      }

      let paymentInitData;
      try {
        paymentInitData = await paymentsApi.createPayment(createdOrder.id, 'RAZORPAY');
      } catch (err) {
        const respData = err.response?.data;
        const msg =
          respData?.detail ||
          respData?.error ||
          (Array.isArray(respData) ? respData[0] : null) ||
          'Failed to initialize Razorpay payment.';
        showToast(msg, 'error');
        setIsSubmitting(false);
        return;
      }

      const resolvedAmountPaise = resolveRazorpayAmountPaise(paymentInitData);
      if (!resolvedAmountPaise || !Number.isInteger(resolvedAmountPaise) || resolvedAmountPaise <= 0) {
        showToast('Invalid payment amount received from server.', 'error');
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: paymentInitData.razorpay_key_id,
        amount: resolvedAmountPaise,
        currency: paymentInitData.currency || 'INR',
        name: 'DjangoMart',
        description: `Order #${createdOrder.id}`,
        order_id: paymentInitData.razorpay_order_id,
        prefill: {
          name:
            paymentInitData.customer?.name ||
            paymentInitData.customer_name ||
            shippingAddress.full_name ||
            '',
          email:
            paymentInitData.customer?.email ||
            paymentInitData.customer_email ||
            '',
          contact:
            paymentInitData.customer?.contact ||
            paymentInitData.customer_phone ||
            shippingAddress.phone ||
            '',
        },
        theme: {
          color: '#000000',
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            showToast('Checkout window was closed. You can retry payment anytime.', 'info');
          },
        },
        handler: async function (response) {
          try {
            await paymentsApi.verifyRazorpayPayment({
              order_id: createdOrder.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            showToast('Payment verified successfully! Your order is confirmed.', 'success');
            navigate(`/orders/${createdOrder.id}`);
          } catch (verifyErr) {
            const respData = verifyErr.response?.data;
            const msg =
              respData?.detail ||
              respData?.error ||
              (Array.isArray(respData) ? respData[0] : null) ||
              'Payment verification failed. Please contact support if your account was debited.';
            showToast(msg, 'error');
            setIsSubmitting(false);
          }
        },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setIsSubmitting(false);
          const failureMsg = resp.error?.description || 'Payment was declined or failed. You may retry.';
          showToast(failureMsg, 'error');
        });
        rzp.open();
      } catch (openErr) {
        setIsSubmitting(false);
        showToast('Could not open Razorpay checkout dialog. Please try again.', 'error');
      }



      return;
    }

    showToast('Please select a valid payment method.', 'warning');
  };


  if (!createdOrder && cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center', maxWidth: '500px' }}>
        <ShoppingBag size={48} color="#000000" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000', marginBottom: '0.5rem' }}>
          Your cart is empty
        </h2>
        <p style={{ color: '#71717a', fontSize: '0.9375rem', marginBottom: '2rem' }}>
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link to="/products" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
          Browse Products
        </Link>
      </div>
    );
  }

  const currentStep = createdOrder ? 2 : 1;
  const currentTotal = createdOrder ? createdOrder.total_price : totalPrice;

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '3rem 0 6rem 0' }}>
      <div className="container">
        {/* 3-Step Stepper Header (Screenshot #7) */}
        <div className="stepper-container">
          <div className={`stepper-step ${currentStep >= 1 ? 'completed active' : ''}`}>
            <span className="stepper-number">1</span>
            <span>Shipping</span>
          </div>
          <div className="stepper-divider" />
          <div className={`stepper-step ${currentStep >= 2 ? 'active' : ''}`}>
            <span className="stepper-number">2</span>
            <span>Payment</span>
          </div>
          <div className="stepper-divider" />
          <div className="stepper-step">
            <span className="stepper-number">3</span>
            <span>Review</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr',
            gap: '3rem',
            alignItems: 'start',
          }}
          className="checkout-layout"
        >
          {/* Main Form Column */}
          <div>
            {!createdOrder ? (
              /* Step 1: Shipping Address Form (Screenshot #7) */
              <div
                className="card"
                style={{
                  padding: '2rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#000000',
                    letterSpacing: '-0.02em',
                    marginBottom: '1.75rem',
                  }}
                >
                  1. Delivery Shipping Address
                </h2>

                <form onSubmit={handleCreateOrder}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label htmlFor="full_name" className="form-label">Full Name *</label>
                      <input
                        id="full_name"
                        type="text"
                        name="full_name"
                        required
                        className="form-input"
                        placeholder="John Doe"
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
                      placeholder="Apartment, suite, unit, building, or street address"
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
                    <label htmlFor="country" className="form-label">Country *</label>
                    <input
                      id="country"
                      type="text"
                      name="country"
                      required
                      className="form-input"
                      value={shippingAddress.country}
                      onChange={handleShippingChange}
                    />
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%', borderRadius: '8px' }}
                    >
                      {isSubmitting ? 'Creating Order...' : 'Confirm Shipping & Continue'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Step 2: Payment & Coupon Method (Screenshot #7) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Shipping Confirmation Card */}
                <div
                  className="card"
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#000000' }}>
                      Shipping Address (Order #{createdOrder.id})
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={14} /> Confirmed
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#52525b', lineHeight: '1.6' }}>
                    <div><strong>{shippingAddress.full_name}</strong> &bull; {shippingAddress.phone}</div>
                    <div>{shippingAddress.address}, {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postal_code}</div>
                  </div>
                </div>

                {/* Payment Selection Card (Screenshot #7) */}
                <div
                  className="card"
                  style={{
                    padding: '2rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                  }}
                >
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000000', marginBottom: '1.5rem' }}>
                    2. Choose Payment Method
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Cash on Delivery (Active) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        padding: '1.25rem',
                        borderRadius: '8px',
                        border: paymentMethod === 'COD' ? '2px solid #000000' : '1px solid #e5e7eb',
                        backgroundColor: paymentMethod === 'COD' ? '#fafafa' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="COD"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="form-radio"
                        style={{ marginTop: '0.25rem' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#000000', fontSize: '0.9375rem' }}>
                          Cash on Delivery (COD)
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#71717a', marginTop: '0.25rem' }}>
                          Pay with cash upon physical delivery at your doorstep. Verified safe & instant.
                        </div>
                      </div>
                    </label>

                    {/* Razorpay Online Payment (Active when configured) */}
                    {paymentConfig.razorpay_enabled ? (
                      <label
                        onClick={() => setPaymentMethod('RAZORPAY')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          padding: '1.25rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'RAZORPAY' ? '2px solid #000000' : '1px solid #e5e7eb',
                          backgroundColor: paymentMethod === 'RAZORPAY' ? '#fafafa' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >

                        <input
                          type="radio"
                          name="payment_method"
                          value="RAZORPAY"
                          checked={paymentMethod === 'RAZORPAY'}
                          onChange={() => setPaymentMethod('RAZORPAY')}
                          className="form-radio"
                          style={{ marginTop: '0.25rem' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 700, color: '#000000', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <CreditCard size={18} />
                              <span>Razorpay (Cards, UPI, NetBanking)</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                              Test Mode Active
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#71717a', marginTop: '0.25rem' }}>
                            Pay securely with test cards, mock UPI QR, NetBanking, or Wallets without real charges.
                          </div>
                        </div>
                      </label>
                    ) : (
                      /* Online Gateway Disabled Notice */
                      <div
                        style={{
                          padding: '1.25rem',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#f4f4f5',
                          opacity: 0.7,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#71717a' }}>
                            <CreditCard size={18} />
                            <span>Online Card / UPI Payment</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#71717a', backgroundColor: '#e4e4e7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            Unavailable
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.35rem' }}>
                          Razorpay gateway credentials are not configured on the server.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coupon Code Input Form */}
                  <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', marginBottom: '0.75rem' }}>
                      Apply Promo or Discount Code
                    </div>
                    <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        className="form-input"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      />
                      <button
                        type="submit"
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        className="btn btn-secondary"
                        style={{ padding: '0.625rem 1.25rem', whiteSpace: 'nowrap' }}
                      >
                        {isApplyingCoupon ? 'Applying...' : 'Apply'}
                      </button>
                    </form>

                    {appliedCoupon && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.625rem 0.875rem',
                          borderRadius: '6px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#15803d',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                        }}
                      >
                        Coupon “{appliedCoupon.coupon}” applied: -₹{Number(appliedCoupon.discount).toFixed(2)} discount!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary (Screenshot #7) */}
          <div
            className="card"
            style={{
              padding: '1.75rem',
              backgroundColor: '#fafafa',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              position: 'sticky',
              top: '5.5rem',
            }}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#000000', marginBottom: '1.5rem' }}>
              Order Summary
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#000000' }}>
                  ₹{Number(createdOrder ? createdOrder.total_price : totalPrice).toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                <span>Shipping</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>Free</span>
              </div>

              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Discount ({appliedCoupon.coupon})</span>
                  <span>-₹{Number(appliedCoupon.discount).toFixed(2)}</span>
                </div>
              )}

              <div
                style={{
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '1rem',
                  marginTop: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: '#000000',
                }}
              >
                <span>Total</span>
                <span>₹{Number(currentTotal).toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order CTA Button */}
            {createdOrder && (
              <div style={{ marginTop: '1.75rem' }}>
                <button
                  onClick={handleConfirmPayment}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', borderRadius: '8px' }}
                >
                  {isSubmitting
                    ? paymentMethod === 'RAZORPAY'
                      ? 'Opening Razorpay...'
                      : 'Processing Order...'
                    : paymentMethod === 'RAZORPAY'
                    ? `Pay with Razorpay (₹${Number(currentTotal).toFixed(2)})`
                    : `Place Order (₹${Number(currentTotal).toFixed(2)})`}
                </button>

              </div>
            )}

            <div
              style={{
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#71717a',
              }}
            >
              <Lock size={14} color="#71717a" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .checkout-layout {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};
export default CheckoutPage;
