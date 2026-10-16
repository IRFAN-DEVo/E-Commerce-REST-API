import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  MapPin,
  Heart,
  ChevronRight,
  ShoppingBag,
  Phone,
  ShieldCheck,
  Ban,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { ordersApi } from '../api/orders';
import { wishlistApi } from '../api/wishlist';
import { getUserDisplayName } from '../utils/user';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { OrderStatusBadge } from '../components/common/Badge';
import { AccountSidebar } from '../components/layout/AccountSidebar';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { cartItems, totalItems, totalPrice, updateItem, removeItem, addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const validTabs = ['dashboard', 'orders', 'addresses', 'wishlist', 'cart', 'settings'];
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(tabFromUrl) ? tabFromUrl : 'dashboard'
  );

  const [orders, setOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [backendWishlist, setBackendWishlist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep activeTab in sync if URL query parameter changes
  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'dashboard') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab });
    }
  };

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const fetcher = ordersApi?.getMyOrders || ordersApi?.getOrders;
      if (typeof fetcher === 'function') {
        const data = await fetcher.call(ordersApi);
        const list = Array.isArray(data) ? data : data?.results || [];
        setOrders(list);
        setRecentOrders(list.slice(0, 5));

        // Extract unique delivery addresses from previous order records
        const extractedAddresses = [];
        const seen = new Set();
        for (const ord of list) {
          const addr = ord.shipping_address;
          if (addr && addr.address) {
            const key = `${addr.address}-${addr.city}-${addr.postal_code}`.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              extractedAddresses.push({
                ...addr,
                orderId: ord.id,
                date: ord.created_at,
              });
            }
          }
        }
        setSavedAddresses(extractedAddresses);
      }
    } catch (err) {
      console.error('Failed to load orders for profile:', err);
    }

    try {
      if (wishlistApi?.getWishlist) {
        const wData = await wishlistApi.getWishlist();
        const wList = Array.isArray(wData) ? wData : wData?.results || [];
        setBackendWishlist(wList);
      }
    } catch (err) {
      console.error('Failed to load wishlist for profile:', err);
      setBackendWishlist(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const currentWishlist =
    backendWishlist && backendWishlist.length > 0 ? backendWishlist : wishlistItems;

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel Order #${orderId}? Product inventory will be restored.`)) {
      return;
    }

    try {
      await ordersApi.cancelOrder(orderId);
      showToast(`Order #${orderId} has been cancelled.`, 'success');
      loadProfileData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Unable to cancel order.';
      showToast(msg, 'error');
    }
  };

  const handleWishlistRemove = async (id, productId) => {
    try {
      await removeFromWishlist(productId || id, id);
      setBackendWishlist((prev) => (prev ? prev.filter((item) => item.id !== id) : null));
      showToast('Removed from wishlist.', 'info');
    } catch (err) {
      showToast('Failed to remove item.', 'error');
    }
  };

  const handleWishlistMoveToCart = async (productId, wishlistId) => {
    const success = await addItem(productId, 1);
    if (success) {
      await removeFromWishlist(productId, wishlistId);
      setBackendWishlist((prev) => (prev ? prev.filter((item) => item.id !== wishlistId) : null));
      showToast('Item moved to cart!', 'success');
    }
  };

  if (!user && !isLoading) {
    return null;
  }

  const getStatusBadgeStyle = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'DELIVERED':
        return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'SHIPPED':
      case 'PROCESSING':
        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'CANCELLED':
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      default:
        return { bg: '#f4f4f5', color: '#52525b', border: '#e4e4e7' };
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
          {/* Animated Left Sidebar */}
          <AnimatedContent
            distance={30}
            direction="horizontal"
            duration={0.65}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
            scale={0.98}
          >
            <AccountSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          </AnimatedContent>

          {/* Right Main Content */}
          <main style={{ minWidth: 0 }}>
            {isLoading ? (
              <div style={{ padding: '4rem 0', textAlign: 'center' }}>
                <LoadingSpinner message="Loading account details..." />
              </div>
            ) : (
              <>
                {/* TAB: DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <div>
                    {/* Greeting Header */}
                    <AnimatedContent
                      key="dashboard-header"
                      distance={25}
                      direction="vertical"
                      duration={0.55}
                      ease="power3.out"
                      initialOpacity={0}
                      animateOpacity
                      delay={0.05}
                    >
                      <div style={{ marginBottom: '2rem' }}>
                        <h1
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color: '#000000',
                            letterSpacing: '-0.025em',
                          }}
                        >
                          Welcome back, {getUserDisplayName(user)}!
                        </h1>
                        <p style={{ color: '#71717a', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                          Here's what's happening with your account.
                        </p>
                      </div>
                    </AnimatedContent>

                    {/* Stat Cards */}
                    <AnimatedContent
                      key="dashboard-stats"
                      distance={30}
                      direction="vertical"
                      duration={0.65}
                      ease="power3.out"
                      initialOpacity={0}
                      animateOpacity
                      scale={0.98}
                      delay={0.1}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '1.5rem',
                          marginBottom: '2.5rem',
                        }}
                        className="stats-grid"
                      >
                        <button
                          type="button"
                          onClick={() => handleTabChange('orders')}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'border-color 150ms ease, box-shadow 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#000000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
                            Total Orders
                          </div>
                          <div
                            style={{
                              fontSize: '2rem',
                              fontWeight: 800,
                              color: '#000000',
                              marginTop: '0.5rem',
                            }}
                          >
                            {orders.length}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTabChange('wishlist')}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'border-color 150ms ease, box-shadow 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#000000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
                            Wishlist Items
                          </div>
                          <div
                            style={{
                              fontSize: '2rem',
                              fontWeight: 800,
                              color: '#000000',
                              marginTop: '0.5rem',
                            }}
                          >
                            {currentWishlist.length}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTabChange('cart')}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'border-color 150ms ease, box-shadow 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#000000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
                            Cart Items
                          </div>
                          <div
                            style={{
                              fontSize: '2rem',
                              fontWeight: 800,
                              color: '#000000',
                              marginTop: '0.5rem',
                            }}
                          >
                            {totalItems}
                          </div>
                        </button>
                      </div>
                    </AnimatedContent>

                    {/* Recent Orders Section */}
                    <AnimatedContent
                      key="dashboard-orders"
                      distance={35}
                      direction="vertical"
                      duration={0.7}
                      ease="power3.out"
                      initialOpacity={0}
                      animateOpacity
                      scale={0.99}
                      delay={0.15}
                    >
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.75rem',
                          marginBottom: '2rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1.5rem',
                          }}
                        >
                          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#000000' }}>
                            Recent Orders
                          </h2>
                          <button
                            type="button"
                            onClick={() => handleTabChange('orders')}
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: '#000000',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            View All →
                          </button>
                        </div>

                        {recentOrders.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {recentOrders.map((order) => {
                              const badge = getStatusBadgeStyle(order.status);
                              return (
                                <Link
                                  key={order.id}
                                  to={`/orders/${order.id}`}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 40px',
                                    alignItems: 'center',
                                    padding: '1rem 0',
                                    borderBottom: '1px solid #f4f4f5',
                                    fontSize: '0.875rem',
                                    color: '#000000',
                                    textDecoration: 'none',
                                    transition: 'background-color 150ms ease',
                                  }}
                                >
                                  <div style={{ fontWeight: 600 }}>
                                    #ORD{String(order.id).padStart(5, '0')}
                                  </div>
                                  <div style={{ color: '#71717a' }}>
                                    {order.created_at
                                      ? new Date(order.created_at).toLocaleDateString()
                                      : 'Recent'}
                                  </div>
                                  <div style={{ fontWeight: 700 }}>
                                    ₹{Number(order.total_price || 0).toFixed(2)}
                                  </div>
                                  <div>
                                    <span
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        backgroundColor: badge.bg,
                                        color: badge.color,
                                        border: `1px solid ${badge.border}`,
                                      }}
                                    >
                                      {order.status || 'Pending'}
                                    </span>
                                  </div>
                                  <div style={{ textAlign: 'right', color: '#a1a1aa' }}>
                                    <ChevronRight size={16} />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '2.5rem 0',
                              textAlign: 'center',
                              color: '#71717a',
                              fontSize: '0.875rem',
                            }}
                          >
                            <ShoppingBag
                              size={36}
                              style={{ margin: '0 auto 0.75rem auto', color: '#a1a1aa' }}
                            />
                            <div>No recent orders placed yet.</div>
                            <Link
                              to="/products"
                              style={{
                                color: '#000000',
                                fontWeight: 600,
                                marginTop: '0.5rem',
                                display: 'inline-block',
                              }}
                            >
                              Explore Our Products →
                            </Link>
                          </div>
                        )}
                      </div>
                    </AnimatedContent>
                  </div>
                )}

                {/* TAB: MY ORDERS */}
                {activeTab === 'orders' && (
                  <AnimatedContent
                    key="tab-orders"
                    distance={35}
                    direction="vertical"
                    duration={0.65}
                    ease="power3.out"
                    initialOpacity={0}
                    animateOpacity
                    scale={0.99}
                  >
                    <div>
                      <div style={{ marginBottom: '2rem' }}>
                        <h1
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color: '#000000',
                            letterSpacing: '-0.025em',
                          }}
                        >
                          My Order History
                        </h1>
                        <p style={{ color: '#71717a', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                          Track, manage, and view receipts for all your placed orders.
                        </p>
                      </div>

                      {orders.length === 0 ? (
                        <div style={{ padding: '2rem 0' }}>
                          <EmptyState
                            icon={ShoppingBag}
                            title="No orders placed yet"
                            description="When you place orders, they will show up here with live status tracking."
                            actionText="Browse Catalog"
                            actionLink="/products"
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {orders.map((order) => {
                            const itemCount =
                              order.items?.reduce((sum, item) => sum + item.quantity, 0) ||
                              order.items?.length ||
                              0;
                            const isCancellable =
                              order.status === 'PENDING' &&
                              order.payment?.payment_status !== 'SUCCESS' &&
                              order.payment_status !== 'SUCCESS';

                            return (
                              <div
                                key={order.id}
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
                                      Placed on{' '}
                                      {order.created_at
                                        ? new Date(order.created_at).toLocaleDateString()
                                        : 'Recent'}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <OrderStatusBadge status={order.status} />
                                    <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                      ₹{Number(order.total_price || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Items & action row */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '1rem',
                                  }}
                                >
                                  <div style={{ fontSize: '0.875rem', color: '#52525b' }}>
                                    Contains <strong>{itemCount}</strong> items &bull; Payment:{' '}
                                    <strong>
                                      {order.payment_method ||
                                        order.payment?.payment_method ||
                                        'Unpaid / Pending'}
                                    </strong>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {isCancellable && (
                                      <button
                                        type="button"
                                        onClick={() => handleCancelOrder(order.id)}
                                        className="btn btn-outline-danger btn-sm"
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                        }}
                                      >
                                        <Ban size={14} />
                                        <span>Cancel Order</span>
                                      </button>
                                    )}

                                    <Link
                                      to={`/orders/${order.id}`}
                                      className="btn btn-secondary btn-sm"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        textDecoration: 'none',
                                      }}
                                    >
                                      <span>View Details</span>
                                      <ChevronRight size={14} />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </AnimatedContent>
                )}

                {/* TAB: WISHLIST */}
                {activeTab === 'wishlist' && (
                  <AnimatedContent
                    key="tab-wishlist"
                    distance={35}
                    direction="vertical"
                    duration={0.65}
                    ease="power3.out"
                    initialOpacity={0}
                    animateOpacity
                    scale={0.99}
                  >
                    <div>
                      <div style={{ marginBottom: '2rem' }}>
                        <h1
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color: '#000000',
                            letterSpacing: '-0.025em',
                          }}
                        >
                          My Wishlist ({currentWishlist.length})
                        </h1>
                        <p style={{ color: '#71717a', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                          Save items you love to revisit or purchase later.
                        </p>
                      </div>

                      {currentWishlist.length === 0 ? (
                        <div style={{ padding: '2rem 0' }}>
                          <EmptyState
                            icon={Heart}
                            title="Your wishlist is empty"
                            description="Save items you love to revisit or purchase later."
                            actionText="Browse Catalog"
                            actionLink="/products"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '1.5rem',
                          }}
                        >
                          {currentWishlist.map((item, index) => {
                            const product =
                              item.product_details ||
                              (typeof item.product === 'object' && item.product !== null
                                ? item.product
                                : item);
                            const productId = product.id || item.product || item.id;
                            const wishlistId =
                              item.wishlist_id || (item.product && item.id ? item.id : null);
                            const key = item.id || productId || index;

                            return (
                              <div
                                key={key}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    height: '200px',
                                    backgroundColor: '#f4f4f5',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {product.image ? (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <span style={{ color: '#a1a1aa' }}>No Image</span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flex: 1,
                                    gap: '0.75rem',
                                    padding: '1.25rem',
                                  }}
                                >
                                  <Link
                                    to={`/products/${productId}`}
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '1rem',
                                      color: '#000000',
                                      textDecoration: 'none',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 1,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {product.name || `Product #${productId}`}
                                  </Link>

                                  {product.price && (
                                    <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                                      ₹{Number(product.price).toFixed(2)}
                                    </div>
                                  )}

                                  <div
                                    style={{
                                      marginTop: 'auto',
                                      display: 'flex',
                                      gap: '0.5rem',
                                      paddingTop: '0.5rem',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleWishlistMoveToCart(productId, wishlistId || item.id)
                                      }
                                      className="btn btn-primary btn-sm"
                                      style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                      }}
                                    >
                                      <ShoppingCart size={14} />
                                      <span>Move to Cart</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleWishlistRemove(wishlistId || item.id, productId)
                                      }
                                      className="btn btn-secondary btn-sm btn-icon"
                                      title="Remove from wishlist"
                                      aria-label="Remove item"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </AnimatedContent>
                )}

                {/* TAB: CART */}
                {activeTab === 'cart' && (
                  <AnimatedContent
                    key="tab-cart"
                    distance={35}
                    direction="vertical"
                    duration={0.65}
                    ease="power3.out"
                    initialOpacity={0}
                    animateOpacity
                    scale={0.99}
                  >
                    <div>
                      <div style={{ marginBottom: '2rem' }}>
                        <h1
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color: '#000000',
                            letterSpacing: '-0.025em',
                          }}
                        >
                          Shopping Cart ({totalItems})
                        </h1>
                        <p style={{ color: '#71717a', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                          Review your items and proceed to checkout.
                        </p>
                      </div>

                      {cartItems.length === 0 ? (
                        <div style={{ padding: '2rem 0' }}>
                          <EmptyState
                            icon={ShoppingBag}
                            title="Your shopping cart is empty"
                            description="Looks like you haven't added any items to your bag yet."
                            actionText="Start Shopping"
                            actionLink="/products"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.7fr 1fr',
                            gap: '2.5rem',
                            alignItems: 'start',
                          }}
                          className="profile-cart-grid"
                        >
                          {/* Cart items list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {cartItems.map((item) => {
                              const product = item.product || {};
                              const itemPrice = item.price || product.price || 0;
                              const itemSubtotal =
                                item.sub_total || Number(itemPrice) * item.quantity;
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    padding: '1.25rem',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '72px',
                                      height: '72px',
                                      borderRadius: '8px',
                                      backgroundColor: '#f4f4f5',
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {product.image ? (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <ShoppingBag size={20} style={{ color: '#a1a1aa' }} />
                                    )}
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <Link
                                      to={`/products/${product.id || item.product_id}`}
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '0.9375rem',
                                        color: '#000000',
                                        textDecoration: 'none',
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {product.name || `Product #${item.product_id}`}
                                    </Link>
                                    <div
                                      style={{
                                        fontSize: '0.8125rem',
                                        color: '#71717a',
                                        marginTop: '0.25rem',
                                      }}
                                    >
                                      Unit Price: ₹{Number(itemPrice).toFixed(2)}
                                    </div>

                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginTop: '0.75rem',
                                      }}
                                    >
                                      {/* Quantity stepper */}
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          border: '1px solid #e5e7eb',
                                          borderRadius: '6px',
                                          backgroundColor: '#ffffff',
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateItem(item.id, Math.max(1, item.quantity - 1))
                                          }
                                          disabled={item.quantity <= 1}
                                          style={{
                                            padding: '0.25rem 0.6rem',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                                            color: item.quantity <= 1 ? '#d4d4d8' : '#000000',
                                            fontWeight: 700,
                                          }}
                                        >
                                          -
                                        </button>
                                        <span
                                          style={{
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                          }}
                                        >
                                          {item.quantity}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateItem(item.id, item.quantity + 1)}
                                          style={{
                                            padding: '0.25rem 0.6rem',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            color: '#000000',
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>

                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '1rem',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontWeight: 700,
                                            fontSize: '0.9375rem',
                                            color: '#000000',
                                          }}
                                        >
                                          ₹{Number(itemSubtotal).toFixed(2)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => removeItem(item.id)}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#dc2626',
                                            cursor: 'pointer',
                                            padding: '0.25rem',
                                          }}
                                          title="Remove from cart"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Order Summary */}
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              padding: '1.5rem',
                            }}
                          >
                            <h2
                              style={{
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                color: '#000000',
                                marginBottom: '1.25rem',
                              }}
                            >
                              Order Summary
                            </h2>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                fontSize: '0.875rem',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  color: '#71717a',
                                }}
                              >
                                <span>Subtotal</span>
                                <span style={{ fontWeight: 600, color: '#000000' }}>
                                  ₹{Number(totalPrice).toFixed(2)}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  color: '#71717a',
                                }}
                              >
                                <span>Estimated Shipping</span>
                                <span style={{ color: '#16a34a', fontWeight: 600 }}>Free</span>
                              </div>
                              <div
                                style={{
                                  borderTop: '1px solid #f4f4f5',
                                  paddingTop: '0.75rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '1rem',
                                  fontWeight: 700,
                                  color: '#000000',
                                }}
                              >
                                <span>Total</span>
                                <span>₹{Number(totalPrice).toFixed(2)}</span>
                              </div>
                            </div>

                            <Link
                              to="/checkout"
                              className="btn btn-primary"
                              style={{
                                width: '100%',
                                marginTop: '1.5rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                fontWeight: 600,
                                textAlign: 'center',
                                textDecoration: 'none',
                                display: 'block',
                              }}
                            >
                              Proceed to Checkout →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </AnimatedContent>
                )}

                {/* TAB: ADDRESSES */}
                {activeTab === 'addresses' && (
                  <AnimatedContent
                    key="tab-addresses"
                    distance={35}
                    direction="vertical"
                    duration={0.65}
                    ease="power3.out"
                    initialOpacity={0}
                    animateOpacity
                    scale={0.99}
                  >
                    <div>
                      <div style={{ marginBottom: '2rem' }}>
                        <h1
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color: '#000000',
                            letterSpacing: '-0.025em',
                          }}
                        >
                          Delivery Addresses
                        </h1>
                        <p style={{ color: '#71717a', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                          Saved delivery addresses used for your orders and checkout.
                        </p>
                      </div>

                      {savedAddresses.length > 0 ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '1.5rem',
                          }}
                        >
                          {savedAddresses.map((addr, idx) => (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.75rem',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      backgroundColor: idx === 0 ? '#000000' : '#f4f4f5',
                                      color: idx === 0 ? '#ffffff' : '#52525b',
                                    }}
                                  >
                                    {idx === 0 ? 'Primary Address' : `Address #${idx + 1}`}
                                  </span>
                                  {addr.orderId && (
                                    <Link
                                      to={`/orders/${addr.orderId}`}
                                      style={{
                                        fontSize: '0.75rem',
                                        color: '#71717a',
                                        textDecoration: 'none',
                                      }}
                                    >
                                      Order #{addr.orderId}
                                    </Link>
                                  )}
                                </div>

                                <div style={{ fontWeight: 700, color: '#000000', marginBottom: '0.25rem' }}>
                                  {addr.full_name || getUserDisplayName(user)}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#52525b', lineHeight: 1.5 }}>
                                  {addr.address}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#52525b', marginTop: '0.25rem' }}>
                                  {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}
                                </div>
                                {addr.country && (
                                  <div style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.25rem' }}>
                                    {addr.country}
                                  </div>
                                )}
                                {addr.phone && (
                                  <div
                                    style={{
                                      fontSize: '0.8125rem',
                                      color: '#71717a',
                                      marginTop: '0.5rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                    }}
                                  >
                                    <Phone size={14} />
                                    <span>{addr.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px dashed #d4d4d8',
                            borderRadius: '12px',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                          }}
                        >
                          <MapPin size={40} style={{ margin: '0 auto 1rem auto', color: '#a1a1aa' }} />
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#000000' }}>
                            No Saved Addresses
                          </h3>
                          <p
                            style={{
                              color: '#71717a',
                              fontSize: '0.875rem',
                              marginTop: '0.5rem',
                              maxWidth: '420px',
                              margin: '0.5rem auto 1.5rem auto',
                            }}
                          >
                            Delivery addresses entered during checkout are automatically saved here for
                            quick reference and future deliveries.
                          </p>
                          <Link
                            to="/products"
                            className="btn btn-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.625rem 1.25rem',
                              borderRadius: '6px',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <ShoppingBag size={16} />
                            <span>Start Shopping</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </AnimatedContent>
                )}

                {/* TAB: SETTINGS */}
                {activeTab === 'settings' && (
                  <AnimatedContent
                    key="tab-settings"
                    distance={35}
                    direction="vertical"
                    duration={0.65}
                    ease="power3.out"
                    initialOpacity={0}
                    animateOpacity
                    scale={0.99}
                  >
                    <div>
                      <div style={{ marginBottom: '2rem' }}>
                        <h1
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            color: '#000000',
                            letterSpacing: '-0.025em',
                          }}
                        >
                          Profile Settings
                        </h1>
                        <p style={{ color: '#71717a', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                          Manage your account information and preferences.
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Personal Information */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.75rem',
                          }}
                        >
                          <h2
                            style={{
                              fontSize: '1.125rem',
                              fontWeight: 700,
                              color: '#000000',
                              marginBottom: '1.5rem',
                            }}
                          >
                            Personal Information
                          </h2>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '1.5rem',
                            }}
                            className="profile-form-grid"
                          >
                            <div>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: '#71717a',
                                  marginBottom: '0.375rem',
                                }}
                              >
                                Display Name
                              </label>
                              <div
                                style={{
                                  padding: '0.75rem 1rem',
                                  backgroundColor: '#f4f4f5',
                                  borderRadius: '6px',
                                  fontSize: '0.9375rem',
                                  color: '#18181b',
                                  fontWeight: 500,
                                }}
                              >
                                {getUserDisplayName(user)}
                              </div>
                            </div>

                            <div>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: '#71717a',
                                  marginBottom: '0.375rem',
                                }}
                              >
                                Email Address
                              </label>
                              <div
                                style={{
                                  padding: '0.75rem 1rem',
                                  backgroundColor: '#f4f4f5',
                                  borderRadius: '6px',
                                  fontSize: '0.9375rem',
                                  color: '#18181b',
                                  fontWeight: 500,
                                }}
                              >
                                {user?.email}
                              </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: '#71717a',
                                  marginBottom: '0.375rem',
                                }}
                              >
                                Phone Number
                              </label>
                              <div
                                style={{
                                  padding: '0.75rem 1rem',
                                  backgroundColor: '#f4f4f5',
                                  borderRadius: '6px',
                                  fontSize: '0.9375rem',
                                  color: '#18181b',
                                  fontWeight: 500,
                                }}
                              >
                                {user?.phone || 'Not provided'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Security & Credentials */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.75rem',
                          }}
                        >
                          <h2
                            style={{
                              fontSize: '1.125rem',
                              fontWeight: 700,
                              color: '#000000',
                              marginBottom: '0.5rem',
                            }}
                          >
                            Security & Password
                          </h2>
                          <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Manage your login security and authentication methods.
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '1rem',
                              backgroundColor: '#fafafa',
                              borderRadius: '8px',
                              border: '1px solid #f4f4f5',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <ShieldCheck size={20} style={{ color: '#16a34a' }} />
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                                  Account Authentication
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                                  Secured with JWT authentication and encrypted credentials.
                                </div>
                              </div>
                            </div>

                            <Link
                              to="/forgot-password"
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: '#000000',
                                padding: '0.5rem 0.875rem',
                                borderRadius: '6px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #d4d4d8',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Reset Password
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AnimatedContent>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .account-layout {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-form-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-form-grid > div {
            grid-column: span 1 !important;
          }
          .profile-cart-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
