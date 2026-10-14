import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Bookmark,
  Tag,
  Percent,
  Settings,
  LogOut,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('djangomart_admin_sidebar');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('djangomart_admin_sidebar', String(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="admin-shell" style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f9fafb' }}>
      {/* Dark Sidebar */}
      <aside
        className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
        style={{
          width: isSidebarOpen ? '260px' : '0px',
          padding: isSidebarOpen ? '1.5rem 1rem' : '0px',
          opacity: isSidebarOpen ? 1 : 0,
          visibility: isSidebarOpen ? 'visible' : 'hidden',
          transition:
            'width 280ms cubic-bezier(0.4, 0, 0.2, 1), padding 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease, visibility 280ms ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          backgroundColor: '#111111',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          minHeight: '100vh',
          zIndex: 40,
        }}
      >
        {/* Brand Logo & Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 0.5rem 1.75rem 0.5rem',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '6px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingBag size={16} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.025em' }}>
              DjangoMart
            </span>
          </div>

          <button
            onClick={toggleSidebar}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '0.375rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
          {/* Home Option */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.875rem',
              borderRadius: '6px',
              color: '#a1a1aa',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Home size={18} />
            <span>Home</span>
          </Link>

          {/* Dashboard */}
          <Link
            to="/admin/dashboard"
            className={location.pathname === '/admin/dashboard' || location.pathname === '/admin' ? 'active' : ''}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          {/* Products */}
          <Link
            to="/admin/products"
            className={location.pathname.startsWith('/admin/products') ? 'active' : ''}
          >
            <Package size={18} />
            <span>Products</span>
          </Link>

          {/* Orders */}
          <Link
            to="/admin/orders"
            className={location.pathname.startsWith('/admin/orders') ? 'active' : ''}
          >
            <ShoppingBag size={18} />
            <span>Orders</span>
          </Link>

          {/* Customers */}
          <Link
            to="/admin/customers"
            className={location.pathname.startsWith('/admin/customers') ? 'active' : ''}
          >
            <Users size={18} />
            <span>Customers</span>
          </Link>

          {/* Categories */}
          <Link
            to="/admin/categories"
            className={location.pathname.startsWith('/admin/categories') ? 'active' : ''}
          >
            <Bookmark size={18} />
            <span>Categories</span>
          </Link>

          {/* Brands */}
          <Link
            to="/admin/brands"
            className={location.pathname.startsWith('/admin/brands') ? 'active' : ''}
          >
            <Tag size={18} />
            <span>Brands</span>
          </Link>

          {/* Coupons */}
          <Link
            to="/admin/coupons"
            className={location.pathname.startsWith('/admin/coupons') ? 'active' : ''}
          >
            <Percent size={18} />
            <span>Coupons</span>
          </Link>

          {/* Settings */}
          <Link
            to="/admin/settings"
            className={location.pathname.startsWith('/admin/settings') ? 'active' : ''}
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </div>

        {/* User Info & Logout at bottom */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: 'auto' }}>
          <div style={{ padding: '0 0.5rem 0.75rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#27272a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user?.first_name ? user.first_name[0].toUpperCase() : 'A'}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email || 'Admin'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#a1a1aa' }}>Administrator</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.875rem',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '0.875rem',
              fontWeight: 500,
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Top Header Bar for Admin */}
        <header
          style={{
            height: '60px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={toggleSidebar}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.8rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#18181b',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f4f4f5';
                e.currentTarget.style.borderColor = '#d4d4d8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
              title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              <span>{isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}</span>
            </button>

            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#71717a' }}>
              Admin Portal
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#18181b',
                textDecoration: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#fafafa',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f4f4f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fafafa';
              }}
            >
              <Home size={14} />
              <span>View Storefront</span>
            </Link>

            <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
              Today: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="admin-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <Outlet context={{ isSidebarOpen, toggleSidebar }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
