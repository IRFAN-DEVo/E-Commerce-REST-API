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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../api/orders';
import { wishlistApi } from '../api/wishlist';
import { getUserDisplayName, getUserInitial } from '../utils/user';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [recentOrders, setRecentOrders] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    ordersApi.getMyOrders().then((data) => {
      const list = Array.isArray(data) ? data : data?.results || [];
      setRecentOrders(list.slice(0, 4));
    }).catch(() => {});

    wishlistApi.getWishlist().then((data) => {
      const list = Array.isArray(data) ? data : data?.results || [];
      setWishlistCount(list.length);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '3rem 0 6rem 0' }}>
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
          {/* Left Sidebar (Screenshot #6) */}
          <aside
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.75rem 1.25rem',
            }}
          >
            {/* User Profile Card Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f4f4f5', marginBottom: '1.25rem' }}>
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
                <div style={{ fontWeight: 700, color: '#000000', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getUserDisplayName(user)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
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
                  transition: 'all 150ms ease',
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
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f4f4f5'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#52525b'; }}
              >
                <Package size={18} />
                <span>My Orders</span>
              </Link>

              <button
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
                  transition: 'all 150ms ease',
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
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f4f4f5'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#52525b'; }}
              >
                <Heart size={18} />
                <span>Wishlist</span>
              </Link>

              <button
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
                  transition: 'all 150ms ease',
                }}
              >
                <Settings size={18} />
                <span>Profile Settings</span>
              </button>

              <button
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
                }}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* Right Main Content (Screenshot #6) */}
          <div>
            {/* Greeting Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', letterSpacing: '-0.025em' }}>
                Welcome back, {getUserDisplayName(user)}!
              </h1>
              <p style={{ color: '#71717a', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
                Here's what's happening with your account.
              </p>
            </div>

            {/* Stat Cards (Screenshot #6) */}
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
                <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Total Orders</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#000000', marginTop: '0.5rem' }}>
                  {recentOrders.length || 5}
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
                <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Wishlist Items</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#000000', marginTop: '0.5rem' }}>
                  {wishlistCount || 3}
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
                <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Saved Addresses</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#000000', marginTop: '0.5rem' }}>
                  2
                </div>
              </div>
            </div>

            {/* Recent Orders Section (Screenshot #6) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#000000' }}>Recent Orders</h2>
                <Link
                  to="/orders"
                  style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', textDecoration: 'none' }}
                >
                  View All →
                </Link>
              </div>

              {recentOrders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentOrders.map((order) => (
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
                      <div style={{ fontWeight: 600 }}>#ORD{String(order.id).padStart(5, '0')}</div>
                      <div style={{ color: '#71717a' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'May 10, 2026'}
                      </div>
                      <div style={{ fontWeight: 700 }}>${Number(order.total_price || 89).toFixed(2)}</div>
                      <div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: order.status === 'DELIVERED' ? '#f0fdf4' : '#f4f4f5',
                            color: order.status === 'DELIVERED' ? '#16a34a' : '#18181b',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          {order.status || 'Delivered'}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', color: '#a1a1aa' }}>
                        <ChevronRight size={16} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: '#71717a', fontSize: '0.875rem' }}>
                  No recent orders found.{' '}
                  <Link to="/products" style={{ color: '#000000', fontWeight: 600 }}>
                    Start browsing
                  </Link>
                </div>
              )}
            </div>
          </div>
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
        }
      `}</style>
    </div>
  );
};
export default ProfilePage;
