import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrdersPage } from '../pages/OrdersPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { ordersApi } from '../api/orders';
import { authApi } from '../api/auth';

vi.mock('../api/orders', () => ({
  ordersApi: {
    getOrders: vi.fn(),
    getOrder: vi.fn(),
    cancelOrder: vi.fn(),
  },
}));

vi.mock('../api/auth', () => ({
  authApi: {
    getProfile: vi.fn(),
  },
}));

const mockOrder = {
  id: 101,
  status: 'PENDING',
  total_price: '1500.00',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  cancellation_deadline: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(), // 22 hours left
  customer_name: 'John Customer',
  customer_email: 'john@example.com',
  payment_method: 'COD',
  payment_status: 'PENDING',
  is_cancellable: true,
  items: [
    {
      id: 1,
      product: 12,
      product_name: 'Premium Headphones',
      price: '1500.00',
      quantity: 1,
      sub_total: '1500.00',
    },
  ],
  shipping_address: {
    full_name: 'John Customer',
    phone: '9876543210',
    address: '123 Test Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560001',
    country: 'India',
  },
};

describe('OrdersPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'john@example.com' }));
    authApi.getProfile.mockResolvedValue({ id: 1, email: 'john@example.com' });
  });

  it('renders order history list with order details, 24h countdown, and status', async () => {
    ordersApi.getOrders.mockResolvedValue([mockOrder]);

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrdersPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('My Order History')).toBeInTheDocument();
      expect(screen.getByText('Order #101')).toBeInTheDocument();
      expect(screen.getByText('₹1500.00')).toBeInTheDocument();
      expect(screen.getByText(/Payment:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel Order/i })).toBeInTheDocument();
      expect(screen.getByText(/Cancel available for/i)).toBeInTheDocument();
    });
  });

  it('displays cancellation window expired indicator when 24 hours have elapsed', async () => {
    const expiredOrder = {
      ...mockOrder,
      id: 103,
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      cancellation_deadline: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      is_cancellable: false,
      cancellation_ineligibility_reason: 'Orders can only be cancelled within 24 hours of placement. The cancellation window has expired.',
    };
    ordersApi.getOrders.mockResolvedValue([expiredOrder]);

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrdersPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Order #103')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cancel Order/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Cancellation window expired/i)).toBeInTheDocument();
    });
  });

  it('hides Cancel Order button for ineligible orders (e.g. SHIPPED or CANCELLED)', async () => {
    const shippedOrder = {
      ...mockOrder,
      id: 102,
      status: 'SHIPPED',
      is_cancellable: false,
      cancellation_ineligibility_reason: 'Shipped orders cannot be cancelled online.',
    };
    ordersApi.getOrders.mockResolvedValue([shippedOrder]);

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrdersPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Order #102')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cancel Order/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Cancellation unavailable/i)).toBeInTheDocument();
    });
  });

  it('opens confirmation dialog on clicking Cancel Order with 24-hour notice and dismisses on Keep Order', async () => {
    ordersApi.getOrders.mockResolvedValue([mockOrder]);

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrdersPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel Order/i })).toBeInTheDocument();
    });

    // Open confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: /Cancel Order/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cancel Order #101')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to cancel this order\? This action cannot be reversed\./i)).toBeInTheDocument();
    expect(screen.getByText(/24-Hour Policy:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep Order/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Cancellation/i })).toBeInTheDocument();

    // Dismiss dialog
    fireEvent.click(screen.getByRole('button', { name: /Keep Order/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(ordersApi.cancelOrder).not.toHaveBeenCalled();
  });

  it('calls cancelOrder on confirmation, refreshes orders, and handles errors', async () => {
    ordersApi.getOrders.mockResolvedValue([mockOrder]);
    ordersApi.cancelOrder.mockResolvedValue({ message: 'Order cancelled successfully.' });

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrdersPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel Order/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cancel Order/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Cancellation/i }));

    await waitFor(() => {
      expect(ordersApi.cancelOrder).toHaveBeenCalledWith(101, expect.any(String));
      expect(ordersApi.getOrders).toHaveBeenCalledTimes(2);
    });
  });

  it('displays empty state when user has no placed orders', async () => {
    ordersApi.getOrders.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrdersPage />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No orders placed yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Browse Catalog/i })).toBeInTheDocument();
    });
  });
});

describe('OrderDetailPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'john@example.com' }));
    authApi.getProfile.mockResolvedValue({ id: 1, email: 'john@example.com' });
  });

  it('renders detailed order summary, shipping address, 24h deadline, and payment status', async () => {
    ordersApi.getOrder.mockResolvedValue(mockOrder);

    render(
      <MemoryRouter initialEntries={['/orders/101']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Order #101')).toBeInTheDocument();
      expect(screen.getByText('Premium Headphones')).toBeInTheDocument();
      expect(screen.getByText('John Customer')).toBeInTheDocument();
      expect(screen.getByText(/123 Test Road/i)).toBeInTheDocument();
      expect(screen.getByText('COD')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel Order/i })).toBeInTheDocument();
      expect(screen.getByText(/Cancellation available until/i)).toBeInTheDocument();
    });
  });

  it('renders cancellation modal on OrderDetailPage and executes cancellation', async () => {
    ordersApi.getOrder.mockResolvedValue(mockOrder);
    ordersApi.cancelOrder.mockResolvedValue({ message: 'Order cancelled successfully.' });

    render(
      <MemoryRouter initialEntries={['/orders/101']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel Order/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cancel Order/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirm Cancellation/i }));

    await waitFor(() => {
      expect(ordersApi.cancelOrder).toHaveBeenCalledWith(101, expect.any(String));
      expect(ordersApi.getOrder).toHaveBeenCalledTimes(2);
    });
  });

  it('displays cancellation details banner when order status is CANCELLED', async () => {
    const cancelledOrder = {
      ...mockOrder,
      status: 'CANCELLED',
      is_cancellable: false,
      cancelled_at: '2026-10-11T12:00:00Z',
      cancellation_reason: 'Customer changed mind',
    };
    ordersApi.getOrder.mockResolvedValue(cancelledOrder);

    render(
      <MemoryRouter initialEntries={['/orders/101']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
      expect(screen.getByText(/Customer changed mind/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cancel Order/i })).not.toBeInTheDocument();
    });
  });

  it('renders Cancel Order button for eligible paid orders (PROCESSING + SUCCESS) within 24 hours', async () => {
    const paidProcessingOrder = {
      ...mockOrder,
      id: 104,
      status: 'PROCESSING',
      payment_method: 'STRIPE',
      payment_status: 'SUCCESS',
      is_cancellable: true,
      cancellation_ineligibility_reason: '',
    };
    ordersApi.getOrder.mockResolvedValue(paidProcessingOrder);

    render(
      <MemoryRouter initialEntries={['/orders/104']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Order #104')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel Order/i })).toBeInTheDocument();
      expect(screen.queryByText(/Paid orders cannot be cancelled directly/i)).not.toBeInTheDocument();
    });
  });
});
