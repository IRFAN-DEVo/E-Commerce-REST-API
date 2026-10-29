import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Ban, MapPin, CreditCard, Package, CheckCircle2 } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { paymentsApi } from '../api/payments';
import { useToast } from '../context/ToastContext';
import { CartContext } from '../context/CartContext';
import { OrderStatusBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const cartContext = useContext(CartContext);
  const fetchCart = cartContext?.fetchCart;
  const clearCartState = cartContext?.clearCartState;

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStripeVerified, setIsStripeVerified] = useState(false);

  const fetchOrderDetail = async () => {
    setIsLoading(true);
    try {
      const data = await ordersApi.getOrder(id);
      setOrder(data);

      // Safe recovery verification if customer returned from Stripe Checkout
      const isStripeRedirect = searchParams.get('payment_status') === 'success' || searchParams.get('session_id');
      if (isStripeRedirect && data.status === 'PENDING') {
        const sessionId = searchParams.get('session_id');
        try {
          const statusRes = await paymentsApi.getStripeSessionStatus(id, sessionId);
          if (statusRes.status === 'SUCCESS') {
            setIsStripeVerified(true);
            clearCartState?.();
            fetchCart?.();
            showToast('Stripe payment verified successfully! Your order is confirmed.', 'success');
            // Re-fetch updated order state
            const updated = await ordersApi.getOrder(id);
            setOrder(updated);
          }
        } catch (statusErr) {
          // Webhook will handle asynchronously if direct recovery was not needed
        }
      } else if (isStripeRedirect && data.status === 'PROCESSING') {
        setIsStripeVerified(true);
        clearCartState?.();
        fetchCart?.();
      }
    } catch (err) {
      showToast('Order not found.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id, searchParams]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    try {
      await ordersApi.cancelOrder(id);
      showToast('Order cancelled successfully.', 'success');
      fetchOrderDetail();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Unable to cancel order.';
      showToast(msg, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading order details..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Order Not Found</h2>
        <Link to="/orders" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Orders
        </Link>
      </div>
    );
  }

  const shipping = order.shipping_address || {};
  const isCancellable = order.status === 'PENDING' && (order.payment?.payment_status !== 'SUCCESS' && order.payment_status !== 'SUCCESS');

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Stripe Payment Confirmation Banner */}
      {isStripeVerified && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle2 size={20} color="#059669" />
          <div>
            <strong>Payment Confirmed!</strong> Your Stripe transaction has been securely verified. We are preparing your order.
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/orders')} className="btn btn-secondary btn-sm" aria-label="Back to orders">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Order #{order.id}</h1>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <OrderStatusBadge status={order.status} />
          {isCancellable && (
            <button onClick={handleCancelOrder} className="btn btn-outline-danger btn-sm">
              <Ban size={16} />
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.8fr) minmax(280px, 1fr)',
          gap: '2.5rem',
          alignItems: 'start',
        }}
        className="order-detail-layout"
      >
        {/* Order Items Table */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Package size={20} color="var(--primary-600)" />
            <span>Items Ordered</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {order.items?.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    {item.product?.name || item.product_name || `Product #${item.product}`}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Qty: {item.quantity} &bull; Price: ₹{Number(item.price).toFixed(2)}
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 800 }}>
            <span>Total Payable</span>
            <span>₹{Number(order.total_price).toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping & Payment Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Shipping Address */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <MapPin size={18} color="var(--primary-600)" />
              <span>Shipping Address</span>
            </h3>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{shipping.full_name}</div>
              <div>{shipping.address}</div>
              <div>
                {shipping.city}, {shipping.state} - {shipping.postal_code}
              </div>
              <div>{shipping.country}</div>
              <div style={{ marginTop: '0.5rem' }}>Phone: {shipping.phone}</div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <CreditCard size={18} color="var(--primary-600)" />
              <span>Payment Details</span>
            </h3>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Method</span>
                <strong style={{ color: 'var(--text-primary)' }}>{order.payment_method || order.payment?.payment_method || 'Cash on Delivery'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Status</span>
                <strong style={{ color: 'var(--text-primary)' }}>{order.payment_status || order.payment?.payment_status || 'PENDING'}</strong>
              </div>
              {order.payment?.transaction_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transaction ID</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.payment.transaction_id}</span>
                </div>
              )}
              {order.payment?.amount && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Recorded Amount</span>
                  <strong>₹{Number(order.payment.amount).toFixed(2)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .order-detail-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
