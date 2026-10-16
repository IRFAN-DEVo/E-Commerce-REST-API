import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Heart,
  Settings,
  LogOut,
  ChevronRight,
  User,
  ShoppingBag,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../api/orders';
import { wishlistApi } from '../api/wishlist';
import { getUserDisplayName, getUserInitial } from '../utils/user';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProfileData = async () => {
      try {
        const fetcher = ordersApi?.getMyOrders || ordersApi?.getOrders;
        if (typeof fetcher === 'function') {
          const data = await fetcher.call(ordersApi);
          const list = Array.isArray(data) ? data : data?.results || [];
          if (isMounted) {
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
        }
      } catch (err) {
        console.error('Failed to load orders for profile:', err);
      }

      try {
        if (wishlistApi?.getWishlist) {
          const wData = await wishlistApi.getWishlist();
          const wList = Array.isArray(wData) ? wData : wData?.results || [];
          if (isMounted) {
            setWishlistCount(wList.length);
          }
        }
      } catch (err) {
        console.error('Failed to load wishlist for profile:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
          {/* Left Sidebar */}
          <aside
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.75rem 1.25rem',
            }}
          >
            {/* User Profile Card Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid #f4f4f5',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  flexShrink: 0,
                }}
              >
                {getUserInitial(user)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: '#000000',
                    fontSize: '0.9375rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getUserDisplayName(user)}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#71717a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'dashboard' ? 600 : 500,
                  backgroundColor: activeTab === 'dashboard' ? '#000000' : 'transparent',
                  color: activeTab === 'dashboard' ? '#ffffff' : '#52525b',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: 'none',
                  transition: 'all 150ms ease',
                  width: '100%',
                }}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>

              <Link
                to="/orders"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#52525b',
                  textDecoration: 'none',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f4f4f5';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#52525b';
                }}
              >
                <Package size={18} />
                <span>My Orders</span>
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'addresses' ? 600 : 500,
                  backgroundColor: activeTab === 'addresses' ? '#000000' : 'transparent',
                  color: activeTab === 'addresses' ? '#ffffff' : '#52525b',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: 'none',
                  transition: 'all 150ms ease',
                  width: '100%',
                }}
              >
                <MapPin size={18} />
                <span>Addresses</span>
              </button>

              <Link
                to="/wishlist"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#52525b',
                  textDecoration: 'none',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f4f4f5';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#52525b';
                }}
              >
                <Heart size={18} />
                <span>Wishlist</span>
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'settings' ? 600 : 500,
                  backgroundColor: activeTab === 'settings' ? '#000000' : 'transparent',
                  color: activeTab === 'settings' ? '#ffffff' : '#52525b',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: 'none',
                  transition: 'all 150ms ease',
                  width: '100%',
                }}
              >
                <Settings size={18} />
                <span>Profile Settings</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#dc2626',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginTop: '0.5rem',
                  borderTop: '1px solid #f4f4f5',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  backgroundColor: 'transparent',
                  width: '100%',
                }}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </aside>

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

                    {/* Stat Cards */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1.5rem',
                        marginBottom: '2.5rem',
                      }}
                      className="stats-grid"
                    >
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.5rem',
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
                      </div>

                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.5rem',
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
                          {wishlistCount}
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.5rem',
                        }}
                      >
                        <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
                          Saved Addresses
                        </div>
                        <div
                          style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#000000',
                            marginTop: '0.5rem',
                          }}
                        >
                          {savedAddresses.length}
                        </div>
                      </div>
                    </div>

                    {/* Recent Orders Section */}
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
                        <Link
                          to="/orders"
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#000000',
                            textDecoration: 'none',
                          }}
                        >
                          View All →
                        </Link>
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
                                  ${Number(order.total_price || 0).toFixed(2)}
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
                  </div>
                )}

                {/* TAB: ADDRESSES */}
                {activeTab === 'addresses' && (
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
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '420px', margin: '0.5rem auto 1.5rem auto' }}>
                          Delivery addresses entered during checkout are automatically saved here for quick reference and future deliveries.
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
                )}

                {/* TAB: SETTINGS */}
                {activeTab === 'settings' && (
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
                              Account Role
                            </label>
                            <div
                              style={{
                                padding: '0.75rem 1rem',
                                backgroundColor: '#f4f4f5',
                                borderRadius: '6px',
                                fontSize: '0.9375rem',
                                color: '#18181b',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                              }}
                            >
                              {user?.user_type === 'owner' ? 'Store Administrator' : 'Customer'}
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
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
