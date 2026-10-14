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
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { notificationsApi } from '../../api/notifications';
import { getUserDisplayName, getUserInitial } from '../../utils/user';

export const Navbar = () => {
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const { totalItems } = useCart();
  const { wishlistCount } = useWishlist();
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

  const isActive = (path) => location.pathname === path;

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.5rem',
          gap: '2rem',
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
            fontSize: '1.4rem',
            color: '#000000',
            letterSpacing: '-0.03em',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={18} strokeWidth={2.2} />
          </div>
          <span>DjangoMart</span>
        </Link>

        {/* Center Navigation Links */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}
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

        {/* Search Bar - Desktop */}
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

        {/* Action Icons (Search/Wishlist/Cart/Account) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Wishlist Icon */}
          <Link
            to="/wishlist"
            style={{
              position: 'relative',
              padding: '0.5rem',
              color: '#18181b',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '9999px',
              transition: 'background-color 150ms ease',
            }}
            aria-label="Wishlist"
          >
            <Heart size={20} strokeWidth={1.8} />
            {wishlistCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '0px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontSize: '0.6875rem',
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
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon & Badge */}
          <Link
            to="/cart"
            style={{
              position: 'relative',
              padding: '0.5rem',
              color: '#18181b',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '9999px',
              transition: 'background-color 150ms ease',
            }}
            aria-label={`Cart with ${totalItems} items`}
          >
            <ShoppingCart size={20} strokeWidth={1.8} />
            {totalItems > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '0px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontSize: '0.6875rem',
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

          {/* Notifications Icon (if logged in) */}
          {isAuthenticated && (
            <Link
              to="/notifications"
              style={{
                position: 'relative',
                padding: '0.5rem',
                color: '#18181b',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label={`Notifications, ${unreadNotifications} unread`}
            >
              <Bell size={20} strokeWidth={1.8} />
              {unreadNotifications > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
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
            <div style={{ position: 'relative' }}>
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
                <span className="desktop-username" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    <div style={{ fontSize: '0.75rem', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                to="/login"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#18181b',
                  padding: '0.5rem 0.875rem',
                }}
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="btn btn-primary"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.8125rem',
                  borderRadius: '9999px',
                }}
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            style={{
              padding: '0.5rem',
              color: '#000000',
              display: 'none',
            }}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ borderRadius: '9999px', paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ padding: '0.5rem 0', fontWeight: 500 }}>Home</Link>
            <Link to="/products" onClick={() => setMobileMenuOpen(false)} style={{ padding: '0.5rem 0', fontWeight: 500 }}>Shop</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} style={{ padding: '0.5rem 0', fontWeight: 500 }}>About</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} style={{ padding: '0.5rem 0', fontWeight: 500 }}>Contact</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav, .desktop-search, .desktop-username {
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
