import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { adminApi } from '../api/admin';

vi.mock('../api/admin', () => ({
  adminApi: {
    getDashboard: vi.fn(),
  },
}));

describe('AdminDashboardPage Component', () => {
  const mockDashboardData = {
    users: {
      total_users: 14,
      new_customers_today: 2,
    },
    products: {
      total_categories: 5,
      total_brands: 4,
      total_products: 42,
      active_products: 38,
      low_stock_products: 3,
      out_of_stock_products: 1,
    },
    orders: {
      total: 25,
      today: 4,
      delivered_today: 2,
      status: {
        pending: 5,
        processing: 4,
        shipped: 3,
        delivered: 12,
        cancelled: 1,
      },
    },
    payments: {
      total: 25,
      status: {
        success: 18,
        pending: 5,
        failed: 2,
      },
    },
    revenue: {
      total: '84500.50',
      today: '4200.00',
      weekly: '25400.00',
      monthly: '84500.50',
      yearly: '84500.50',
    },
    growth: {
      sales: {
        percentage: 15.4,
        period: 'vs last month',
        current: 84500.5,
        previous: 73200.0,
      },
      orders: {
        percentage: 8.7,
        period: 'vs last month',
        current: 25,
        previous: 23,
      },
      customers: {
        percentage: -5.0,
        period: 'vs last month',
        current: 14,
        previous: 15,
      },
    },
    chart_7days: {
      labels: ['Oct 11', 'Oct 12', 'Oct 13', 'Oct 14', 'Oct 15', 'Oct 16', 'Oct 17'],
      revenue: [1200, 3400, 2100, 0, 5600, 4200, 1500],
      orders: [1, 3, 2, 0, 4, 3, 1],
      period: '7d',
    },
    chart_30days: {
      labels: ['Day 1', 'Day 2', 'Day 3'],
      revenue: [5000, 6000, 7000],
      orders: [5, 6, 7],
      period: '30d',
    },
    chart_monthly: {
      labels: ['Jan', 'Feb', 'Mar'],
      revenue: [12000, 15000, 18000],
      orders: [10, 12, 15],
      period: '12m',
    },
    recent_orders: [
      {
        id: 101,
        order_number: '#ORD00101',
        customer: 'John Doe',
        email: 'john@example.com',
        total: 4500.0,
        status: 'DELIVERED',
        date: 'Oct 16, 2026',
      },
      {
        id: 102,
        order_number: '#ORD00102',
        customer: 'Jane Smith',
        email: 'jane@example.com',
        total: 1250.0,
        status: 'PENDING',
        date: 'Oct 17, 2026',
      },
    ],
    recent_activity: [
      {
        id: 'act-1',
        type: 'order_placed',
        title: 'Order #102 Placed',
        description: 'Jane Smith placed order #102 (PENDING) - Rs. 1250.00',
        timestamp: '2026-10-17T10:00:00Z',
      },
      {
        id: 'act-2',
        type: 'welcome',
        title: 'New Customer Registered',
        description: 'Jane Smith (jane@example.com) joined DjangoMart',
        timestamp: '2026-10-17T09:30:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner while fetching metrics', () => {
    adminApi.getDashboard.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Aggregating live store metrics/i)).toBeInTheDocument();
  });

  it('displays database-backed KPI statistics from API response', async () => {
    adminApi.getDashboard.mockResolvedValueOnce(mockDashboardData);

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });

    // Check Total Sales formatted with Indian Rupee formatting
    expect(screen.getByText(/₹84,500\.50/i)).toBeInTheDocument();

    // Check Total Orders
    expect(screen.getByText('25')).toBeInTheDocument();

    // Check Customers
    expect(screen.getByText('14')).toBeInTheDocument();

    // Check Products
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/38 active/i)).toBeInTheDocument();

    // Check Growth Indicators
    expect(screen.getByText('+15.4%')).toBeInTheDocument();
    expect(screen.getByText('+8.7%')).toBeInTheDocument();
    expect(screen.getByText('-5%')).toBeInTheDocument();
  });

  it('renders recent orders from API response with valid links and statuses', async () => {
    adminApi.getDashboard.mockResolvedValueOnce(mockDashboardData);

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#ORD00101')).toBeInTheDocument();
    });

    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/₹4,500\.00/i)).toBeInTheDocument();
    expect(screen.getByText('#ORD00102')).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Smith/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/₹1,250\.00/i)).toBeInTheDocument();
  });

  it('renders recent store activity items from database logs', async () => {
    adminApi.getDashboard.mockResolvedValueOnce(mockDashboardData);

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Store Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('Order #102 Placed')).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith placed order #102/i)).toBeInTheDocument();
    expect(screen.getByText('New Customer Registered')).toBeInTheDocument();
  });

  it('handles period and metric switching in the sales overview chart', async () => {
    adminApi.getDashboard.mockResolvedValueOnce(mockDashboardData);

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sales Revenue Analytics')).toBeInTheDocument();
    });

    // Toggle to Orders metric
    const ordersBtn = screen.getByRole('button', { name: 'Orders' });
    fireEvent.click(ordersBtn);
    expect(screen.getByText('Order Volume Analytics')).toBeInTheDocument();

    // Toggle to 30D period
    const thirtyDaysBtn = screen.getByRole('button', { name: '30D' });
    fireEvent.click(thirtyDaysBtn);
    expect(screen.getByText(/Last 30 Days/i)).toBeInTheDocument();
  });

  it('displays clean error state and allows retry on network failure', async () => {
    adminApi.getDashboard.mockRejectedValueOnce(new Error('Server unavailable'));

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to aggregate store analytics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Connection/i })).toBeInTheDocument();

    // Now mock success for retry
    adminApi.getDashboard.mockResolvedValueOnce(mockDashboardData);
    fireEvent.click(screen.getByRole('button', { name: /Retry Connection/i }));

    await waitFor(() => {
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });
  });

  it('renders clean empty states when database has no records', async () => {
    const emptyData = {
      users: { total_users: 0, new_customers_today: 0 },
      products: { total_categories: 0, total_brands: 0, total_products: 0, active_products: 0, low_stock_products: 0, out_of_stock_products: 0 },
      orders: { total: 0, today: 0, delivered_today: 0, status: { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 } },
      payments: { total: 0, status: { success: 0, pending: 0, failed: 0 } },
      revenue: { total: '0.00', today: '0.00', weekly: '0.00', monthly: '0.00', yearly: '0.00' },
      growth: {
        sales: { percentage: 0.0, period: 'vs last month' },
        orders: { percentage: 0.0, period: 'vs last month' },
        customers: { percentage: 0.0, period: 'vs last month' },
      },
      chart_7days: { labels: [], revenue: [], orders: [] },
      recent_orders: [],
      recent_activity: [],
    };

    adminApi.getDashboard.mockResolvedValueOnce(emptyData);

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Sales')).toBeInTheDocument();
    });

    expect(screen.getByText('₹0.00')).toBeInTheDocument();
    expect(screen.getByText('No customer orders placed yet.')).toBeInTheDocument();
    expect(screen.getByText('No recent store activity recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('No sales recorded in this period')).toBeInTheDocument();
  });
});
