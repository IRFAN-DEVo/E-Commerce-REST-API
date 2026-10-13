import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load notifications.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      showToast('Failed to mark notification as read.', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      showToast('Failed to mark all as read.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading notifications..." />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Updates about your orders and payments will appear here."
          actionText="Explore Store"
          actionLink="/"
        />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {unreadCount > 0 ? `${unreadCount} unread update(s)` : 'All caught up!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              padding: '1.25rem',
              backgroundColor: n.is_read ? '#ffffff' : 'var(--primary-50)',
              borderLeft: n.is_read ? '1px solid var(--border-color)' : '4px solid var(--primary-600)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                {n.title}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                {n.message}
              </p>
              {n.created_at && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              )}
            </div>

            {!n.is_read && (
              <button
                onClick={() => handleMarkAsRead(n.id)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Mark Read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
