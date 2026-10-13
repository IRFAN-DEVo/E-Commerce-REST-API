import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  ShoppingCart,
  Heart,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { notificationsApi } from '../../api/notifications';

export const Navbar = () => {
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Fetch unread notifications count if logged in
  useEffect(() => {
    if (isAuthenticated) {
      notificationsApi
        .getNotifications()
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.results || [];
          const unread = list.filter((n) => !n.is_read).length;
          setUnreadNotifications(unread);
        })
        .catch(() => {});
    } else {
      setUnreadNotifications(0);
    }
  }, [isAuthenticated, location.pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.25rem',
          gap: '1.5rem',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            fontWeight: 800,
            fontSize: '1.35rem',
            color: 'var(--primary-600)',
            letterSpacing: '-0.025em',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={20} />
          </div>
          <span>DjangoMart</span>
        </Link>

        {/* Search Bar - Desktop */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flex: 1,
            maxWidth: '520px',
            position: 'relative',
          }}
          className="desktop-search"
        >
          <input
            type="text"
            className="form-input"
            placeholder="Search products, brands, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingRight: '2.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--gray-50)',
            }}
            aria-label="Search products"
          />
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--gray-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Submit search"
          >
            <Search size={18} />
          </button>
        </form>

        {/* Navigation & Action Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="desktop-nav">
          <Link
            to="/products"
            style={{
              fontWeight: 500,
              fontSize: '0.9375rem',
              color: location.pathname === '/products' ? 'var(--primary-600)' : 'var(--text-secondary)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Products
          </Link>

          {/* Cart Icon & Counter */}
          <Link
            to="/cart"
            style={{
              position: 'relative',
              padding: '0.5rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={`Cart with ${totalItems} items`}
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '0px',
                  backgroundColor: 'var(--primary-600)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {totalItems}
              </span>
            )}
          </Link>

          {/* Wishlist Link */}
          {isAuthenticated && (
            <Link
              to="/wishlist"
              style={{
                padding: '0.5rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Wishlist"
            >
              <Heart size={22} />
            </Link>
          )}

          {/* Notifications Link */}
          {isAuthenticated && (
            <Link
              to="/notifications"
              style={{
                position: 'relative',
                padding: '0.5rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label={`Notifications, ${unreadNotifications} unread`}
            >
              <Bell size={22} />
              {unreadNotifications > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--danger-500)',
                    borderRadius: '50%',
                  }}
                />
              )}
            </Link>
          )}

          {/* User Account Dropdown or Login Button */}
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--gray-50)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <User size={16} color="var(--primary-600)" />
                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || user?.email?.split('@')[0] || 'Account'}
                </span>
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 0.5rem)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '200px',
                    padding: '0.5rem 0',
                    zIndex: 100,
                  }}
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      borderBottom: '1px solid var(--border-color)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                  </div>

                  {isOwner && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        color: 'var(--primary-600)',
                        fontWeight: 600,
                      }}
                    >
                      <LayoutDashboard size={16} />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <Link
                    to="/orders"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <ShoppingBag size={16} />
                    <span>My Orders</span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </Link>

                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        color: 'var(--danger-600)',
                        textAlign: 'left',
                      }}
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Toggle Button */}
        <button
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          style={{ display: 'none', color: 'var(--text-primary)' }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid var(--border-color)',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
          className="mobile-drawer"
        >
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <Search size={18} />
            </button>
          </form>

          <Link to="/products" onClick={() => setMobileMenuOpen(false)}>
            Browse Products
          </Link>
          <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
            Shopping Cart ({totalItems})
          </Link>

          {isAuthenticated ? (
            <>
              {isOwner && (
                <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  Admin Dashboard
                </Link>
              )}
              <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>
                My Orders
              </Link>
              <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)}>
                Wishlist
              </Link>
              <Link to="/notifications" onClick={() => setMobileMenuOpen(false)}>
                Notifications ({unreadNotifications})
              </Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                My Profile
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                style={{ textAlign: 'left', color: 'var(--danger-600)', fontWeight: 600 }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Link
                to="/login"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-search, .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
};
