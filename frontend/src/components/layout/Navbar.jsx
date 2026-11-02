import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  Search,
  Menu,
  X,
  Heart,
  Package,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { notificationsApi } from '../../api/notifications';
import { getUserDisplayName, getUserInitial } from '../../utils/user';

export const Navbar = () => {
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const cartContext = useContext(CartContext);
  const totalCartItems = cartContext?.totalItems || 0;
  const { wishlistCount } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname, location.search]);

  // Lock background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [mobileMenuOpen]);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (userDropdownOpen) setUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, userDropdownOpen]);

  // Fetch unread notifications count if logged in
  const isNotificationsPage = location.pathname === '/notifications';
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
  }, [isAuthenticated, isNotificationsPage]);

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
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.5rem',
          gap: 'clamp(0.5rem, 2vw, 2rem)',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 800,
            fontSize: 'clamp(1.15rem, 3.5vw, 1.4rem)',
            color: '#000000',
            letterSpacing: '-0.03em',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          aria-label="DjangoMart Home"
        >
          <div
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShoppingBag size={17} strokeWidth={2.2} />
          </div>
          <span>DjangoMart</span>
        </Link>

        {/* Center Navigation Links - Desktop Only */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}
          aria-label="Main Navigation"
        >
          <Link
            to="/"
            style={{
              fontSize: '0.9375rem',
              fontWeight: isActive('/') ? 600 : 500,
              color: isActive('/') ? '#000000' : '#52525b',
              transition: 'color 150ms ease',
            }}
          >
            Home
          </Link>
          <Link
            to="/products"
            style={{
              fontSize: '0.9375rem',
              fontWeight: isActive('/products') ? 600 : 500,
              color: isActive('/products') ? '#000000' : '#52525b',
              transition: 'color 150ms ease',
            }}
          >
            Shop
          </Link>
          <Link
            to="/about"
            style={{
              fontSize: '0.9375rem',
              fontWeight: isActive('/about') ? 600 : 500,
              color: isActive('/about') ? '#000000' : '#52525b',
              transition: 'color 150ms ease',
            }}
          >
            About
          </Link>
          <Link
            to="/contact"
            style={{
              fontSize: '0.9375rem',
              fontWeight: isActive('/contact') ? 600 : 500,
              color: isActive('/contact') ? '#000000' : '#52525b',
              transition: 'color 150ms ease',
            }}
          >
            Contact
          </Link>
        </nav>

        {/* Search Bar - Desktop Only */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flex: 1,
            maxWidth: '380px',
            position: 'relative',
          }}
          className="desktop-search"
        >
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.5rem',
              fontSize: '0.875rem',
              borderRadius: '9999px',
              backgroundColor: '#f4f4f5',
              border: '1px solid transparent',
              outline: 'none',
              transition: 'all 150ms ease',
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.borderColor = '#000000';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#f4f4f5';
              e.target.style.borderColor = 'transparent';
            }}
            aria-label="Search products"
          />
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#71717a',
              pointerEvents: 'none',
            }}
          />
        </form>

        {/* Action Icons (Wishlist, Cart, Account, Hamburger) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(0.25rem, 1.5vw, 0.625rem)',
          }}
        >
          {/* Wishlist Link */}
          <Link
            to="/wishlist"
            className="touch-target"
            style={{
              position: 'relative',
              color: '#18181b',
              borderRadius: '50%',
            }}
            aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'}
          >
            <Heart size={20} strokeWidth={1.8} />
            {wishlistCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '9999px',
                  backgroundColor: '#0a0a0a',
                  color: '#ffffff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}
              >
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Link with Badge */}
          <Link
            to="/cart"
            className="touch-target"
            style={{
              position: 'relative',
              color: '#18181b',
              borderRadius: '50%',
            }}
            aria-label={totalCartItems > 0 ? `Cart, ${totalCartItems} items` : 'Cart'}
          >
            <ShoppingBag size={20} strokeWidth={1.8} />
            {totalCartItems > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '9999px',
                  backgroundColor: '#0a0a0a',
                  color: '#d4ff00',
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}
              >
                {totalCartItems}
              </span>
            )}
          </Link>

          {/* Notifications Icon (Desktop / Tablet if logged in) */}
          {isAuthenticated && (
            <Link
              to="/notifications"
              className="touch-target desktop-notifications-link"
              style={{
                position: 'relative',
                color: '#18181b',
              }}
              aria-label={`Notifications, ${unreadNotifications} unread`}
            >
              <Bell size={20} strokeWidth={1.8} />
              {unreadNotifications > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '7px',
                    height: '7px',
                    backgroundColor: '#000000',
                    borderRadius: '50%',
                  }}
                />
              )}
            </Link>
          )}

          {/* User Account / Profile Menu */}
          {isAuthenticated ? (
            <div style={{ position: 'relative' }} className="desktop-user-menu">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '9999px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'border-color 150ms ease',
                  cursor: 'pointer',
                }}
                aria-expanded={userDropdownOpen}
                aria-label="User menu"
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {getUserInitial(user)}
                </div>
                <span
                  className="desktop-username"
                  style={{
                    maxWidth: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getUserDisplayName(user)}
                </span>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '210px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                    padding: '0.5rem 0',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #f4f4f5' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                      {getUserDisplayName(user)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#71717a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user?.email}
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      color: '#27272a',
                    }}
                  >
                    <User size={16} />
                    <span>My Account</span>
                  </Link>

                  <Link
                    to="/orders"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      color: '#27272a',
                    }}
                  >
                    <Package size={16} />
                    <span>My Orders</span>
                  </Link>

                  {isOwner && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        color: '#000000',
                        fontWeight: 600,
                        borderTop: '1px solid #f4f4f5',
                      }}
                    >
                      <LayoutDashboard size={16} />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      color: '#b91c1c',
                      borderTop: '1px solid #f4f4f5',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="btn btn-primary desktop-login-btn"
              style={{
                padding: '0.45rem 1.125rem',
                fontSize: '0.8125rem',
                borderRadius: '9999px',
              }}
            >
              Log In
            </Link>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn touch-target"
            style={{
              color: '#000000',
              backgroundColor: mobileMenuOpen ? '#f4f4f5' : '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            aria-label={mobileMenuOpen ? 'Close mobile navigation' : 'Open mobile navigation'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            top: '4.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 90,
          }}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Navigation Panel */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '4.5rem',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            padding: '1.25rem 1rem 2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            overflowY: 'auto',
            zIndex: 95,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Mobile Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                borderRadius: '9999px',
                paddingLeft: '2.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #e4e4e7',
              }}
              aria-label="Search products in mobile menu"
            />
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#71717a',
                pointerEvents: 'none',
              }}
            />
          </form>

          {/* User Status Bar if Authenticated */}
          {isAuthenticated ? (
            <div
              style={{
                backgroundColor: '#fafafa',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getUserInitial(user)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: '#000000',
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
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#000000',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  whiteSpace: 'nowrap',
                }}
              >
                Profile
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary"
                style={{ borderRadius: '8px', padding: '0.625rem', fontSize: '0.875rem' }}
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-secondary"
                style={{ borderRadius: '8px', padding: '0.625rem', fontSize: '0.875rem' }}
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.5rem',
                fontWeight: isActive('/') ? 700 : 500,
                color: isActive('/') ? '#000000' : '#27272a',
                borderBottom: '1px solid #f4f4f5',
                fontSize: '0.9375rem',
              }}
            >
              <span>Home</span>
              <ChevronRight size={16} color="#a1a1aa" />
            </Link>

            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.5rem',
                fontWeight: isActive('/products') ? 700 : 500,
                color: isActive('/products') ? '#000000' : '#27272a',
                borderBottom: '1px solid #f4f4f5',
                fontSize: '0.9375rem',
              }}
            >
              <span>Shop All Products</span>
              <ChevronRight size={16} color="#a1a1aa" />
            </Link>

            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.5rem',
                fontWeight: 500,
                color: '#27272a',
                borderBottom: '1px solid #f4f4f5',
                fontSize: '0.9375rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <ShoppingBag size={18} />
                <span>My Cart</span>
              </div>
              {totalCartItems > 0 && (
                <span
                  style={{
                    fontWeight: 800,
                    backgroundColor: '#0a0a0a',
                    color: '#d4ff00',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                  }}
                >
                  {totalCartItems}
                </span>
              )}
            </Link>

            <Link
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.5rem',
                fontWeight: 500,
                color: '#27272a',
                borderBottom: '1px solid #f4f4f5',
                fontSize: '0.9375rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Heart size={18} />
                <span>My Wishlist</span>
              </div>
              {wishlistCount > 0 && (
                <span
                  style={{
                    fontWeight: 700,
                    backgroundColor: '#f4f4f5',
                    color: '#0a0a0a',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.5rem',
                    fontWeight: 500,
                    color: '#27272a',
                    borderBottom: '1px solid #f4f4f5',
                    fontSize: '0.9375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <Package size={18} />
                    <span>My Orders</span>
                  </div>
                  <ChevronRight size={16} color="#a1a1aa" />
                </Link>

                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.5rem',
                    fontWeight: 500,
                    color: '#27272a',
                    borderBottom: '1px solid #f4f4f5',
                    fontSize: '0.9375rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <Bell size={18} />
                    <span>Notifications</span>
                  </div>
                  {unreadNotifications > 0 && (
                    <span
                      style={{
                        fontWeight: 700,
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                      }}
                    >
                      {unreadNotifications}
                    </span>
                  )}
                </Link>

                {isOwner && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.5rem',
                      fontWeight: 600,
                      color: '#000000',
                      borderBottom: '1px solid #f4f4f5',
                      fontSize: '0.9375rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <LayoutDashboard size={18} />
                      <span>Admin Portal</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      ADMIN
                    </span>
                  </Link>
                )}
              </>
            )}

            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.5rem',
                fontWeight: 500,
                color: '#27272a',
                borderBottom: '1px solid #f4f4f5',
                fontSize: '0.9375rem',
              }}
            >
              <span>About Us</span>
              <ChevronRight size={16} color="#a1a1aa" />
            </Link>

            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.5rem',
                fontWeight: 500,
                color: '#27272a',
                fontSize: '0.9375rem',
              }}
            >
              <span>Contact Support</span>
              <ChevronRight size={16} color="#a1a1aa" />
            </Link>
          </div>

          {/* Sign Out Button if Authenticated */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '8px',
                color: '#dc2626',
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        .mobile-menu-btn {
          display: none !important;
        }
        @media (max-width: 900px) {
          .desktop-nav,
          .desktop-search,
          .desktop-username,
          .desktop-notifications-link,
          .desktop-login-btn,
          .desktop-user-menu {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
