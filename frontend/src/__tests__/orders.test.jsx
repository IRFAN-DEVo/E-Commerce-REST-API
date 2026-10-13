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
  created_at: '2026-10-10T10:00:00Z',
  customer_name: 'John Customer',
  customer_email: 'john@example.com',
  payment_method: 'COD',
  payment_status: 'PENDING',
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

  it('renders order history list with order details and status', async () => {
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
    });
  });

  it('handles order cancellation on user confirmation', async () => {
    ordersApi.getOrders.mockResolvedValue([mockOrder]);
    ordersApi.cancelOrder.mockResolvedValue({ message: 'Order cancelled successfully.' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

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

    await waitFor(() => {
      expect(ordersApi.cancelOrder).toHaveBeenCalledWith(101);
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

  it('renders detailed order summary, shipping address, and payment status', async () => {
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
    });
  });
});
