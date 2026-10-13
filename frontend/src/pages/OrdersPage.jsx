import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Ban } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { useToast } from '../context/ToastContext';
import { OrderStatusBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await ordersApi.getOrders();
      setOrders(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load orders.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel Order #${orderId}? Product inventory will be restored.`)) {
      return;
    }

    try {
      await ordersApi.cancelOrder(orderId);
      showToast(`Order #${orderId} has been cancelled.`, 'success');
      loadOrders();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Unable to cancel order.';
      showToast(msg, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading your orders..." />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <EmptyState
          icon={ShoppingBag}
          title="No orders placed yet"
          description="When you place orders, they will show up here with live status tracking."
          actionText="Browse Catalog"
          actionLink="/products"
        />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>
        My Order History
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {orders.map((order) => {
          const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || order.items?.length || 0;
          const isCancellable = order.status === 'PENDING' && (order.payment?.payment_status !== 'SUCCESS' && order.payment_status !== 'SUCCESS');

          return (
            <div
              key={order.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '1rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                    Order #{order.id}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recent'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <OrderStatusBadge status={order.status} />
                  <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                    ₹{Number(order.total_price || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Contains <strong>{itemCount}</strong> items &bull; Payment: <strong>{order.payment_method || order.payment?.payment_method || 'Unpaid / Pending'}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {isCancellable && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="btn btn-outline-danger btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Ban size={14} />
                      <span>Cancel Order</span>
                    </button>
                  )}

                  <Link to={`/orders/${order.id}`} className="btn btn-secondary btn-sm">
                    <span>View Details</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
