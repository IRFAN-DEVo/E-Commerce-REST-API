import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { OrderStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const { showToast } = useToast();

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await adminApi.getAdminOrders(params);
      setOrders(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load administrative orders.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await adminApi.updateAdminOrderStatus(orderId, newStatus);
      showToast(`Order #${orderId} status changed to ${newStatus}.`, 'success');
      loadOrders();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.status?.[0] || 'Status update failed.';
      showToast(msg, 'error');
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading customer orders..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Manage Customer Orders</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Review and progress customer order fulfillment states
          </p>
        </div>

        <div>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map((order) => (
          <div
            key={order.id}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <strong style={{ fontSize: '1.125rem' }}>Order #{order.id}</strong>
                <OrderStatusBadge status={order.status} />
              </div>

              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                Customer: <strong>{order.user_email || order.user}</strong> &bull; Date: {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recent'}
              </div>

              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Ship to: {order.shipping_address?.full_name}, {order.shipping_address?.city}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order Total</div>
                <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>
                  ₹{Number(order.total_price || 0).toFixed(2)}
                </div>
              </div>

              {/* Status Update Control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Update:</span>
                <select
                  className="form-select form-select-sm"
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  style={{ width: 'auto', fontSize: '0.8125rem', padding: '0.375rem 0.625rem' }}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No orders match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
};
