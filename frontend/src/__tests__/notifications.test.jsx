import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationsPage } from '../pages/NotificationsPage';

vi.mock('../api/notifications', () => ({
  notificationsApi: {
    getNotifications: vi.fn().mockResolvedValue([
      { id: 1, title: 'Order Shipped', message: 'Your hardware is on its way.', is_read: false, created_at: new Date().toISOString() },
      { id: 2, title: 'Payment Confirmed', message: 'Razorpay payment was successful.', is_read: true, created_at: new Date().toISOString() },
    ]),
    markAsRead: vi.fn().mockResolvedValue({}),
    markAllAsRead: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

describe('NotificationsPage with AnimatedContent', () => {
  it('renders notifications header and notification cards', async () => {
    render(<NotificationsPage />);

    expect(await screen.findByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText(/system activity/i)).toBeInTheDocument();
    expect(screen.getByText('Order Shipped')).toBeInTheDocument();
    expect(screen.getByText('Payment Confirmed')).toBeInTheDocument();
    expect(screen.getByText(/mark all as read/i)).toBeInTheDocument();
  });
});
