import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName, getUserInitial } from '../../utils/user';

export const AccountSidebar = ({ activeTab = 'dashboard', onTabChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/profile?tab=dashboard' },
    { id: 'orders', label: 'My Orders', icon: Package, path: '/profile?tab=orders' },
    { id: 'addresses', label: 'Addresses', icon: MapPin, path: '/profile?tab=addresses' },
    { id: 'settings', label: 'Profile Settings', icon: Settings, path: '/profile?tab=settings' },
  ];

  return (
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (onTabChange) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? '#000000' : 'transparent',
                  color: isActive ? '#ffffff' : '#52525b',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: 'none',
                  transition: 'all 150ms ease',
                  width: '100%',
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {Boolean(item.badge) && item.badge > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: isActive ? '#27272a' : '#f4f4f5',
                      color: isActive ? '#ffffff' : '#18181b',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                      border: isActive ? '1px solid #3f3f46' : '1px solid #e5e7eb',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? '#000000' : 'transparent',
                color: isActive ? '#ffffff' : '#52525b',
                textDecoration: 'none',
                transition: 'all 150ms ease',
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {Boolean(item.badge) && item.badge > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    backgroundColor: isActive ? '#27272a' : '#f4f4f5',
                    color: isActive ? '#ffffff' : '#18181b',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    border: isActive ? '1px solid #3f3f46' : '1px solid #e5e7eb',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

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
  );
};

export default AccountSidebar;
