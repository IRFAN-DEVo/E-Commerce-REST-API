import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, CheckCircle2 } from 'lucide-react';
import { notificationsApi } from '../api/notifications';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApi.getNotifications();
      setNotifications(Array.isArray(data) ? data : data?.results || []);
    } catch {
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
    } catch {
      showToast('Failed to mark notification as read.', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('All notifications marked as read.', 'success');
    } catch {
      showToast('Failed to mark all as read.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <LoadingSpinner message="Loading notifications..." />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="container" style={{ padding: '5rem 1.5rem', maxWidth: '640px' }}>
        <AnimatedContent
          distance={30}
          direction="vertical"
          duration={0.6}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: 'clamp(3rem, 6vw, 4.5rem) 2rem',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#0a0a0a',
              }}
            >
              <Bell size={30} strokeWidth={1.75} />
            </div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#0a0a0a',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
              }}
            >
              No notifications yet
            </h2>
            <p
              style={{
                color: '#71717a',
                fontSize: '0.9375rem',
                maxWidth: '420px',
                margin: '0 auto 2rem',
                lineHeight: 1.5,
              }}
            >
              Updates regarding order milestones, payment receipts, and security will appear here.
            </p>
          </div>
        </AnimatedContent>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: 'clamp(2.5rem, 5vw, 4.5rem) 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '860px' }}>
        {/* Header with AnimatedContent */}
        <AnimatedContent
          distance={20}
          direction="vertical"
          duration={0.55}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
        >
          <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <span
                style={{
                  backgroundColor: '#d4ff00',
                  color: '#0a0a0a',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                SYSTEM ACTIVITY
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#71717a',
                }}
              >
                COMMUNICATION DISPATCH
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: '#0a0a0a',
                    lineHeight: 1.1,
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  Notifications
                </h1>
                <p style={{ color: '#71717a', fontSize: '0.9375rem', margin: '0.5rem 0 0', fontWeight: 500 }}>
                  {unreadCount > 0 ? `${unreadCount} unread update(s)` : 'All caught up! No unread notifications.'}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#262626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0a0a0a';
                  }}
                >
                  <CheckCheck size={16} />
                  <span>Mark All as Read</span>
                </button>
              )}
            </div>
          </div>
        </AnimatedContent>

        {/* Notifications List with AnimatedContent */}
        <AnimatedContent
          distance={25}
          direction="vertical"
          duration={0.65}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
          delay={0.08}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '1.5rem',
                  backgroundColor: n.is_read ? '#ffffff' : '#fafafa',
                  border: n.is_read ? '1px solid #e5e7eb' : '1px solid #0a0a0a',
                  borderLeft: n.is_read ? '1px solid #e5e7eb' : '4px solid #0a0a0a',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'all 150ms ease',
                  boxShadow: n.is_read ? 'none' : '0 4px 14px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    {!n.is_read && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#d4ff00',
                          border: '1.5px solid #0a0a0a',
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: '#0a0a0a',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {n.title}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#52525b', margin: '0.35rem 0', lineHeight: 1.55 }}>
                    {n.message}
                  </p>

                  {n.created_at && (
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.65rem', fontWeight: 500 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  )}
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0a0a0a',
                      border: '1px solid #d4d4d8',
                      borderRadius: '9999px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0a0a0a';
                      e.currentTarget.style.backgroundColor = '#f4f4f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d4d4d8';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Mark Read</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </AnimatedContent>
      </div>
    </div>
  );
};

export default NotificationsPage;
