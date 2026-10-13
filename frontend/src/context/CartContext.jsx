import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../api/cart';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    try {
      setIsLoading(true);
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err) {
      // Graceful error handling for cart load failure
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated, fetchCart]);

  const addItem = useCallback(
    async (productId, quantity = 1) => {
      if (!isAuthenticated) {
        showToast('Please sign in to add items to your cart.', 'warning');
        return false;
      }
      try {
        await cartApi.addToCart(productId, quantity);
        await fetchCart();
        showToast('Item added to cart!', 'success');
        return true;
      } catch (err) {
        const errorMsg =
          err.response?.data?.product?.[0] ||
          err.response?.data?.detail ||
          err.response?.data?.error ||
          'Failed to add item to cart.';
        showToast(errorMsg, 'error');
        return false;
      }
    },
    [isAuthenticated, fetchCart, showToast]
  );

  const updateItem = useCallback(
    async (itemId, quantity) => {
      try {
        await cartApi.updateCartItem(itemId, quantity);
        await fetchCart();
        return true;
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail ||
          err.response?.data?.quantity?.[0] ||
          'Failed to update cart.';
        showToast(errorMsg, 'error');
        return false;
      }
    },
    [fetchCart, showToast]
  );

  const removeItem = useCallback(
    async (itemId) => {
      try {
        await cartApi.deleteCartItem(itemId);
        await fetchCart();
        showToast('Item removed from cart.', 'info');
        return true;
      } catch (err) {
        showToast('Failed to remove item.', 'error');
        return false;
      }
    },
    [fetchCart, showToast]
  );

  const clearCartState = useCallback(() => {
    setCart(null);
  }, []);

  const value = {
    cart,
    cartItems: cart?.cart_items || [],
    totalItems: cart?.total_items || 0,
    totalPrice: cart?.total_price || '0.00',
    isLoading,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    clearCartState,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
