import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WishlistPage } from '../pages/WishlistPage';

vi.mock('../api/wishlist', () => ({
  wishlistApi: {
    getWishlist: vi.fn().mockResolvedValue([]),
    addToWishlist: vi.fn().mockResolvedValue({}),
    removeFromWishlist: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../context/WishlistContext', () => ({
  useWishlist: vi.fn(() => ({
    wishlistItems: [],
    removeFromWishlist: vi.fn(),
  })),
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
}));

describe('WishlistPage standalone component', () => {
  it('renders dedicated wishlist header and empty state without profile sidebar', async () => {
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
