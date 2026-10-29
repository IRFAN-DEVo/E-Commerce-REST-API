import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Ban, Clock } from 'lucide-react';
import { ordersApi } from '../api/orders';
import { useToast } from '../context/ToastContext';
import { OrderStatusBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { AccountSidebar } from '../components/layout/AccountSidebar';
import { AnimatedContent } from '../components/common/AnimatedContent';
import { CancelOrderModal } from '../components/orders/CancelOrderModal';
import { getCancellationDeadlineInfo } from '../utils/orderCancellation';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
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

  const handleOpenCancelModal = (order) => {
    setCancelModalOrder(order);
  };

  const handleCloseCancelModal = () => {
    if (!isCancelling) {
      setCancelModalOrder(null);
    }
  };

  const handleConfirmCancel = async (orderId, reason) => {
    setIsCancelling(true);
    try {
      await ordersApi.cancelOrder(orderId, reason);
      showToast(`Order #${orderId} has been cancelled successfully.`, 'success');
      setCancelModalOrder(null);
      await loadOrders();
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.message
        || 'Unable to cancel order.';
      showToast(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: '3rem 0 6rem 0' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '3rem',
            alignItems: 'start',
          }}
          className="account-layout"
        >
          <AnimatedContent
            distance={30}
            direction="horizontal"
            duration={0.65}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
            scale={0.98}
          >
            <AccountSidebar activeTab="orders" />
          </AnimatedContent>

          <main style={{ minWidth: 0 }}>
            {isLoading ? (
              <div style={{ padding: '4rem 0' }}>
                <LoadingSpinner message="Loading your orders..." />
              </div>
            ) : orders.length === 0 ? (
              <AnimatedContent
                distance={35}
                direction="vertical"
                duration={0.6}
                ease="power3.out"
                initialOpacity={0}
                animateOpacity
                scale={0.98}
              >
                <div style={{ padding: '2rem 0' }}>
                  <EmptyState
                    icon={ShoppingBag}
                    title="No orders placed yet"
                    description="When you place orders, they will show up here with live status tracking."
                    actionText="Browse Catalog"
                    actionLink="/products"
                  />
                </div>
              </AnimatedContent>
            ) : (
              <AnimatedContent
                distance={35}
                direction="vertical"
                duration={0.65}
                ease="power3.out"
                initialOpacity={0}
                animateOpacity
                scale={0.99}
              >
                <div>
                  <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>
                    My Order History
                  </h1>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {orders.map((order) => {
                      const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || order.items?.length || 0;
                      const isCancellable = order.is_cancellable !== undefined
                        ? Boolean(order.is_cancellable)
                        : (order.status === 'PENDING' || order.status === 'PROCESSING');
                      const deadlineInfo = getCancellationDeadlineInfo(order);

                      return (
                        <div
                          key={order.id}
                          className="card"
                          style={{
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              borderBottom: '1px solid #f4f4f5',
                              paddingBottom: '1rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                Order #{order.id}
                              </div>
                              <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                                Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recent'}
                                {order.status === 'CANCELLED' && order.cancelled_at && (
                                  <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>
                                    &bull; Cancelled on {new Date(order.cancelled_at).toLocaleDateString()}
                                  </span>
                                )}
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
                            <div style={{ fontSize: '0.875rem', color: '#52525b' }}>
                              Contains <strong>{itemCount}</strong> items &bull; Payment: <strong>{order.payment_method || order.payment?.payment_method || 'Unpaid / Pending'}</strong>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              {isCancellable ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                                  {deadlineInfo && !deadlineInfo.isExpired && (
                                    <span
                                      title={deadlineInfo.detail}
                                      style={{
                                        fontSize: '0.75rem',
                                        color: '#15803d',
                                        backgroundColor: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        borderRadius: '9999px',
                                        padding: '0.2rem 0.625rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontWeight: 500,
                                      }}
                                    >
                                      <Clock size={12} />
                                      <span>{deadlineInfo.label}</span>
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCancelModal(order)}
                                    className="btn btn-outline-danger btn-sm"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  >
                                    <Ban size={14} />
                                    <span>Cancel Order</span>
                                  </button>
                                </div>
                              ) : deadlineInfo && deadlineInfo.isExpired && (order.status === 'PENDING' || order.status === 'PROCESSING') ? (
                                <span
                                  title={order.cancellation_ineligibility_reason || deadlineInfo.detail}
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#b91c1c',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '9999px',
                                    padding: '0.2rem 0.625rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  <Clock size={12} />
                                  <span>Cancellation window expired</span>
                                </span>
                              ) : order.cancellation_ineligibility_reason && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' ? (
                                <span
                                  title={order.cancellation_ineligibility_reason}
                                  style={{ fontSize: '0.75rem', color: '#a1a1aa', fontStyle: 'italic' }}
                                >
                                  Cancellation unavailable
                                </span>
                              ) : null}

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
              </AnimatedContent>
            )}
          </main>
        </div>
      </div>

      <CancelOrderModal
        isOpen={!!cancelModalOrder}
        order={cancelModalOrder}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        isSubmitting={isCancelling}
      />

      <style>{`
        @media (max-width: 900px) {
          .account-layout {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OrdersPage;
