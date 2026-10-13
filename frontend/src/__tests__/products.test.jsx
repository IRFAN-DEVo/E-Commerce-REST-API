import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProductCard } from '../components/products/ProductCard';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { productsApi } from '../api/products';
import { reviewsApi } from '../api/reviews';

vi.mock('../api/products', () => ({
  productsApi: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    getCategories: vi.fn(),
    getBrands: vi.fn(),
  },
}));

vi.mock('../api/reviews', () => ({
  reviewsApi: {
    getProductReviews: vi.fn(),
    createReview: vi.fn(),
  },
}));

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>{ui}</CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

describe('ProductCard component', () => {
  const mockProduct = {
    id: 1,
    name: 'Wireless Noise Canceling Headphones',
    price: '2999.00',
    discount_price: '2499.00',
    stock: 15,
    is_available: true,
    category_name: 'Electronics',
    brand_name: 'SoundWave',
  };

  it('renders product name, category, and brand correctly', () => {
    renderWithProviders(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Wireless Noise Canceling Headphones')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText(/SoundWave/i)).toBeInTheDocument();
  });

  it('displays discounted price and original crossed-out price', () => {
    renderWithProviders(<ProductCard product={mockProduct} />);

    expect(screen.getByText('₹2499.00')).toBeInTheDocument();
    expect(screen.getByText('₹2999.00')).toBeInTheDocument();
  });

  it('displays stock badge', () => {
    renderWithProviders(<ProductCard product={mockProduct} />);

    expect(screen.getByText('15 in stock')).toBeInTheDocument();
  });

  it('disables add button when product is out of stock', () => {
    const outOfStockProduct = {
      ...mockProduct,
      stock: 0,
      is_available: false,
    };
    renderWithProviders(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    const addButton = screen.getByRole('button', { name: /cart/i });
    expect(addButton).toBeDisabled();
  });
});

describe('ProductsPage catalog component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getCategories.mockResolvedValue([
      { id: 1, name: 'Audio' },
      { id: 2, name: 'Computers' },
    ]);
    productsApi.getBrands.mockResolvedValue([
      { id: 10, name: 'SoundWave' },
    ]);
  });

  it('loads and renders product listing from backend API', async () => {
    productsApi.getProducts.mockResolvedValue({
      count: 1,
      results: [
        {
          id: 1,
          name: 'Pro Wireless Headphones',
          price: '4999.00',
          stock: 20,
          is_available: true,
          category_name: 'Audio',
        },
      ],
    });

    renderWithProviders(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pro Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('₹4999.00')).toBeInTheDocument();
    });
  });

  it('handles search input and applies search query to products API', async () => {
    productsApi.getProducts.mockResolvedValue({
      count: 0,
      results: [],
    });

    renderWithProviders(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search products in view/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search products in view/i);
    fireEvent.change(searchInput, { target: { value: 'Mechanical' } });

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Mechanical' })
      );
    });
  });

  it('renders empty state when no products match filters', async () => {
    productsApi.getProducts.mockResolvedValue({
      count: 0,
      results: [],
    });

    renderWithProviders(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('No products matched your criteria')).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument();
    });
  });
});

describe('ProductDetailPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders single product details with price and stock', async () => {
    productsApi.getProduct.mockResolvedValue({
      id: 1,
      name: 'Sony WH-1000XM5',
      price: '29999.00',
      discount_price: '26999.00',
      stock: 8,
      is_available: true,
      category_name: 'Audio',
      brand_name: 'Sony',
      description: 'Industry-leading noise cancelling headphones.',
    });
    reviewsApi.getProductReviews.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/products/:id" element={<ProductDetailPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sony WH-1000XM5' })).toBeInTheDocument();
      expect(screen.getByText('₹26999.00')).toBeInTheDocument();
      expect(screen.getByText('₹29999.00')).toBeInTheDocument();
      expect(screen.getByText('Industry-leading noise cancelling headphones.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
    });
  });

  it('displays out of stock message when product stock is 0', async () => {
    productsApi.getProduct.mockResolvedValue({
      id: 2,
      name: 'Vintage Camera',
      price: '15000.00',
      stock: 0,
      is_available: false,
      description: 'Out of stock vintage model.',
    });
    reviewsApi.getProductReviews.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/products/2']}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/products/:id" element={<ProductDetailPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vintage Camera' })).toBeInTheDocument();
      expect(screen.getByText('Currently Out of Stock')).toBeInTheDocument();
    });
  });
});
