import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WishlistPage } from '../pages/WishlistPage';
import { WishlistProvider, useWishlist } from '../context/WishlistContext';
import { wishlistApi } from '../api/wishlist';
import * as AuthContextModule from '../context/AuthContext';
import * as ToastContextModule from '../context/ToastContext';

vi.mock('../api/wishlist', () => ({
  wishlistApi: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    checkWishlist: vi.fn(),
  },
}));

vi.mock('../context/CartContext', () => ({
  useCart: vi.fn(() => ({
    addItem: vi.fn(),
  })),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
  ToastProvider: ({ children }) => <div>{children}</div>,
}));

describe('WishlistPage standalone component', () => {
  it('renders dedicated wishlist header and empty state without profile sidebar', async () => {
    vi.mocked(wishlistApi.getWishlist).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>
    );

    // Check standalone header
    expect(await screen.findByRole('heading', { name: /my wishlist/i })).toBeInTheDocument();
    expect(screen.getByText(/personal wishlist/i)).toBeInTheDocument();

    // Check empty state
    expect(screen.getByText(/your wishlist is empty/i)).toBeInTheDocument();
    expect(screen.getByText(/browse catalog/i)).toBeInTheDocument();

    // Verify profile sidebar items are NOT present
    expect(screen.queryByText(/profile settings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/my orders/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/active orders/i)).not.toBeInTheDocument();
  });
});

// Component to interact with WishlistContext in tests
const TestWishlistConsumer = ({ productToActOn }) => {
  const { wishlistItems, wishlistCount, isInWishlist, addToWishlist, removeFromWishlist, toggleWishlist } =
    useWishlist();

  return (
    <div>
      <div data-testid="wishlist-count">{wishlistCount}</div>
      <div data-testid="is-in-wishlist">
        {productToActOn ? (isInWishlist(productToActOn.id) ? 'YES' : 'NO') : 'NO'}
      </div>
      <button data-testid="add-btn" onClick={() => addToWishlist(productToActOn)}>
        Add Product
      </button>
      <button data-testid="toggle-btn" onClick={() => toggleWishlist(productToActOn)}>
        Toggle Product
      </button>
      <button data-testid="remove-btn" onClick={() => removeFromWishlist(productToActOn?.id)}>
        Remove Product
      </button>
      <ul>
        {wishlistItems.map((item) => (
          <li key={item.id} data-testid={`item-${item.id}`}>
            {item.product_details?.name || item.name || 'item'}
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('WishlistContext Authentication and Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('unauthenticated guest clicking add does NOT call backend API and displays Login Required modal', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });

    const sampleProduct = { id: 101, name: 'Minimalist Sneaker', price: '120.00' };

    render(
      <MemoryRouter>
        <WishlistProvider>
          <TestWishlistConsumer productToActOn={sampleProduct} />
        </WishlistProvider>
      </MemoryRouter>
    );

    // Initial count is 0
    expect(screen.getByTestId('wishlist-count')).toHaveTextContent('0');

    // Click Add as guest
    fireEvent.click(screen.getByTestId('add-btn'));

    // Backend must NOT be called
    expect(wishlistApi.addToWishlist).not.toHaveBeenCalled();

    // Login Required modal must be opened
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/login required/i)).toBeInTheDocument();
    expect(screen.getByText(/please log in to your djangomart account/i)).toBeInTheDocument();

    // Product was saved in sessionStorage as pending item
    const saved = JSON.parse(sessionStorage.getItem('djangomart_pending_wishlist'));
    expect(saved).toBeTruthy();
    expect(saved.id).toBe(101);
    expect(saved.name).toBe('Minimalist Sneaker');
  });

  it('authenticated user adding a product triggers backend API and updates state optimistically', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      isLoading: false,
    });

    vi.mocked(wishlistApi.getWishlist).mockResolvedValueOnce([]);
    vi.mocked(wishlistApi.addToWishlist).mockResolvedValueOnce({
      id: 42,
      product: 102,
      created_at: new Date().toISOString(),
    });

    const sampleProduct = { id: 102, name: 'Runner Shoes', price: '150.00' };

    render(
      <MemoryRouter>
        <WishlistProvider>
          <TestWishlistConsumer productToActOn={sampleProduct} />
        </WishlistProvider>
      </MemoryRouter>
    );

    // Click Add as authenticated user
    fireEvent.click(screen.getByTestId('add-btn'));

    // Backend API was called
    expect(wishlistApi.addToWishlist).toHaveBeenCalledWith(102);

    // Wait for item to be updated in context
    await waitFor(() => {
      expect(screen.getByTestId('is-in-wishlist')).toHaveTextContent('YES');
      expect(screen.getByTestId('wishlist-count')).toHaveTextContent('1');
    });
  });

  it('prompts user with confirmation dialog after login when pending wishlist product exists in sessionStorage', async () => {
    // Pre-populate sessionStorage as if guest previously selected a product
    sessionStorage.setItem(
      'djangomart_pending_wishlist',
      JSON.stringify({
        id: 103,
        name: 'Classic Oxford Shoes',
        product: { id: 103, name: 'Classic Oxford Shoes' },
      })
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      isLoading: false,
    });

    vi.mocked(wishlistApi.getWishlist).mockResolvedValueOnce([]);
    vi.mocked(wishlistApi.addToWishlist).mockResolvedValueOnce({
      id: 99,
      product: 103,
    });

    render(
      <MemoryRouter>
        <WishlistProvider>
          <TestWishlistConsumer productToActOn={{ id: 103, name: 'Classic Oxford Shoes' }} />
        </WishlistProvider>
      </MemoryRouter>
    );

    // Confirmation modal should appear
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/add to your wishlist\?/i)).toBeInTheDocument();
    expect(screen.getByText(/classic oxford shoes/i)).toBeInTheDocument();

    // Confirm addition
    const confirmBtn = screen.getByRole('button', { name: /add to wishlist/i });
    fireEvent.click(confirmBtn);

    // Should call API and clear sessionStorage
    await waitFor(() => {
      expect(wishlistApi.addToWishlist).toHaveBeenCalledWith(103);
      expect(sessionStorage.getItem('djangomart_pending_wishlist')).toBeNull();
    });
  });

  it('canceling pending wishlist confirmation modal clears sessionStorage without calling backend API', async () => {
    sessionStorage.setItem(
      'djangomart_pending_wishlist',
      JSON.stringify({
        id: 104,
        name: 'Denim Jacket',
        product: { id: 104, name: 'Denim Jacket' },
      })
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' },
      isLoading: false,
    });

    vi.mocked(wishlistApi.getWishlist).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <WishlistProvider>
          <TestWishlistConsumer productToActOn={{ id: 104, name: 'Denim Jacket' }} />
        </WishlistProvider>
      </MemoryRouter>
    );

    // Confirmation modal should appear
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Click No, Thanks (Cancel)
    const cancelBtn = screen.getByRole('button', { name: /no, thanks/i });
    fireEvent.click(cancelBtn);

    // API was NOT called for adding
    expect(wishlistApi.addToWishlist).not.toHaveBeenCalled();

    // Storage is cleared
    expect(sessionStorage.getItem('djangomart_pending_wishlist')).toBeNull();
  });
});
