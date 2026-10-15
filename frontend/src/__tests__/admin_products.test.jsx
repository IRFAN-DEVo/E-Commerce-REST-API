import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage';
import { AdminProductFormPage } from '../pages/admin/AdminProductFormPage';
import { AdminProductImportPage } from '../pages/admin/AdminProductImportPage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { adminApi } from '../api/admin';

vi.mock('../api/admin', () => ({
  adminApi: {
    getAdminProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    downloadProductTemplate: vi.fn(),
    previewProductImport: vi.fn(),
    importProducts: vi.fn(),
    deleteProductImage: vi.fn(),
  },
}));

const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
};

describe('AdminProductsPage', () => {
  const mockProducts = [
    {
      id: 1,
      name: 'Sony WH-1000XM4',
      sku: 'SONY-WH-001',
      price: '19999.00',
      stock: 10,
      stock_status: 'IN_STOCK',
      category_name: 'Audio',
      brand_name: 'Sony',
      is_available: true,
    },
    {
      id: 2,
      name: 'Logitech MX Master 3S',
      sku: 'LOGI-MX-3S',
      price: '7999.00',
      stock: 0,
      stock_status: 'OUT_OF_STOCK',
      category_name: 'Accessories',
      brand_name: 'Logitech',
      is_available: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getAdminProducts.mockResolvedValue({
      count: 2,
      results: mockProducts,
    });
    adminApi.getCategories.mockResolvedValue([
      { id: 1, name: 'Audio' },
      { id: 2, name: 'Accessories' },
    ]);
    adminApi.getBrands.mockResolvedValue([
      { id: 1, name: 'Sony' },
      { id: 2, name: 'Logitech' },
    ]);
  });

  it('renders page title, header action buttons, search, and product table rows', async () => {
    renderWithProviders(<AdminProductsPage />);

    // Header checks
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
    expect(screen.getByText('Import Products')).toBeInTheDocument();

    // Search input check
    expect(
      screen.getByPlaceholderText('Search by product name, SKU, or brand...')
    ).toBeInTheDocument();

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByText('Sony WH-1000XM4')).toBeInTheDocument();
      expect(screen.getByText('SONY-WH-001')).toBeInTheDocument();
      expect(screen.getByText('Logitech MX Master 3S')).toBeInTheDocument();
      expect(screen.getByText('LOGI-MX-3S')).toBeInTheDocument();
    });
  });

  it('toggles filter panel when clicking Filters button', async () => {
    renderWithProviders(<AdminProductsPage />);

    const filterButton = screen.getByRole('button', { name: /filters/i });
    expect(screen.queryByText('All Categories')).not.toBeInTheDocument();

    fireEvent.click(filterButton);
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('All Brands')).toBeInTheDocument();
  });
});

describe('AdminProductFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getCategories.mockResolvedValue([{ id: 1, name: 'Audio' }]);
    adminApi.getBrands.mockResolvedValue([{ id: 1, name: 'Sony' }]);
  });

  it('renders Add Product form with all required fields and SKU', async () => {
    renderWithProviders(<AdminProductFormPage />);

    await waitFor(() => {
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Wireless Noise-Cancelling/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/WN-HD-001/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Detailed description of features/i)).toBeInTheDocument();
    });
  });

  it('validates required fields before submitting', async () => {
    renderWithProviders(<AdminProductFormPage />);

    await waitFor(() => {
      expect(screen.getByText('Create Product')).toBeInTheDocument();
    });

    const form = document.getElementById('product-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Product name is required.')).toBeInTheDocument();
      expect(screen.getByText('Please select a category.')).toBeInTheDocument();
      expect(screen.getByText('Please select a brand.')).toBeInTheDocument();
      expect(screen.getByText('Price must be greater than zero.')).toBeInTheDocument();
    });
  });
});

describe('AdminProductImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CSV upload, ZIP upload, matching options, and download template button', () => {
    renderWithProviders(<AdminProductImportPage />);

    expect(screen.getByText('Import Products')).toBeInTheDocument();
    expect(screen.getByText('Download CSV Template')).toBeInTheDocument();
    expect(screen.getByText(/1\. Catalog Data File/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Product Images ZIP/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Matching & Update Strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/Validate & Preview Import/i)).toBeInTheDocument();
  });
});
