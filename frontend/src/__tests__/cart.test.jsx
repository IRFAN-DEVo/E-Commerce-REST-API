import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CartPage } from '../pages/CartPage';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { cartApi } from '../api/cart';
import { authApi } from '../api/auth';

vi.mock('../api/cart', () => ({
  cartApi: {
    getCart: vi.fn(),
    updateCartItem: vi.fn(),
    deleteCartItem: vi.fn(),
    addToCart: vi.fn(),
  },
}));

vi.mock('../api/auth', () => ({
  authApi: {
    getProfile: vi.fn(),
  },
}));

const renderCartPage = () => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <CartPage />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

describe('CartPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('prompts sign in when user is not authenticated', () => {
    renderCartPage();
    expect(screen.getByText('Sign in to view your cart')).toBeInTheDocument();
  });

  it('renders cart items and order summary when authenticated with items', async () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'user@example.com' }));

    authApi.getProfile.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartApi.getCart.mockResolvedValue({
      id: 10,
      total_items: 2,
      total_price: '400.00',
      cart_items: [
        {
          id: 101,
          quantity: 2,
          sub_total: '400.00',
          product: {
            id: 5,
            name: 'Leather Weekend Bag',
            price: '200.00',
          },
        },
      ],
    });

    renderCartPage();

    await waitFor(() => {
      expect(screen.getByText('Leather Weekend Bag')).toBeInTheDocument();
      expect(screen.getByText('Unit Price: ₹200.00')).toBeInTheDocument();
      expect(screen.getByText('Subtotal: ₹400.00')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proceed to Checkout/i })).toBeInTheDocument();
    });
  });

  it('handles item quantity decrement', async () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'user@example.com' }));

    authApi.getProfile.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartApi.getCart.mockResolvedValue({
      id: 10,
      total_items: 2,
      total_price: '400.00',
      cart_items: [
        {
          id: 101,
          quantity: 2,
          sub_total: '400.00',
          product: {
            id: 5,
            name: 'Leather Weekend Bag',
            price: '200.00',
          },
        },
      ],
    });
    cartApi.updateCartItem.mockResolvedValue({});

    renderCartPage();

    await waitFor(() => {
      expect(screen.getByText('Leather Weekend Bag')).toBeInTheDocument();
    });

    const decreaseBtn = screen.getByRole('button', { name: /Decrease quantity/i });
    fireEvent.click(decreaseBtn);

    expect(cartApi.updateCartItem).toHaveBeenCalledWith(101, 1);
  });

  it('handles item removal when delete button is clicked', async () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'user@example.com' }));

    authApi.getProfile.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartApi.getCart.mockResolvedValue({
      id: 10,
      total_items: 1,
      total_price: '200.00',
      cart_items: [
        {
          id: 101,
          quantity: 1,
          sub_total: '200.00',
          product: { id: 5, name: 'Leather Weekend Bag', price: '200.00', stock: 5 },
        },
      ],
    });
    cartApi.deleteCartItem.mockResolvedValue({});

    renderCartPage();

    await waitFor(() => {
      expect(screen.getByText('Leather Weekend Bag')).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /Remove Leather Weekend Bag from cart/i });
    fireEvent.click(removeBtn);

    expect(cartApi.deleteCartItem).toHaveBeenCalledWith(101);
  });

  it('disables quantity increment button when stock limit is reached', async () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'user@example.com' }));

    authApi.getProfile.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartApi.getCart.mockResolvedValue({
      id: 10,
      total_items: 3,
      total_price: '600.00',
      cart_items: [
        {
          id: 101,
          quantity: 3,
          sub_total: '600.00',
          product: { id: 5, name: 'Limited Stock Item', price: '200.00', stock: 3 },
        },
      ],
    });

    renderCartPage();

    await waitFor(() => {
      expect(screen.getByText('Limited Stock Item')).toBeInTheDocument();
      expect(screen.getByText('Stock: 3 available')).toBeInTheDocument();
    });

    const increaseBtn = screen.getByRole('button', { name: /Increase quantity/i });
    expect(increaseBtn).toBeDisabled();
  });

  it('renders empty cart state when user has no items', async () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, email: 'user@example.com' }));

    authApi.getProfile.mockResolvedValue({ id: 1, email: 'user@example.com' });
    cartApi.getCart.mockResolvedValue({
      id: 10,
      total_items: 0,
      total_price: '0.00',
      cart_items: [],
    });

    renderCartPage();

    await waitFor(() => {
      expect(screen.getByText('Your shopping cart is empty')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Start Shopping/i })).toBeInTheDocument();
    });
  });
});
