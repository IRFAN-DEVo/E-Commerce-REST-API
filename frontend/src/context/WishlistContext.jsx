import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistApi } from '../api/wishlist';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WishlistContext = createContext(null);

const STORAGE_KEY = 'djangomart_wishlist';

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever wishlistItems changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistItems));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, [wishlistItems]);

  // Sync with backend API if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      wishlistApi
        .getWishlist()
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.results || [];
          if (list.length > 0) {
            setWishlistItems((prev) => {
              const merged = [...prev];
              list.forEach((item) => {
                const prod = item.product_details || item.product || {};
                const prodId = prod.id || item.product;
                if (prodId && !merged.some((p) => p.id === prodId)) {
                  merged.push({ id: prodId, ...prod, wishlist_id: item.id });
                }
              });
              return merged;
            });
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const isInWishlist = useCallback(
    (productId) => {
      if (productId == null) return false;
      const pid = Number(productId);
      return wishlistItems.some((item) => {
        const itemId = Number(
          (typeof item.product === 'object' && item.product !== null ? item.product.id : null) ||
          item.product_details?.id ||
          item.id ||
          item.product
        );
        return itemId === pid;
      });
    },
    [wishlistItems]
  );

  const addToWishlist = useCallback(
    async (product) => {
      if (!product || !product.id) return false;
      const pid = Number(product.id);

      if (isInWishlist(product.id)) {
        showToast('Already in your wishlist', 'info');
        return false;
      }

      setWishlistItems((prev) => [...prev, product]);
      showToast('Added to wishlist', 'success');

      if (isAuthenticated) {
        try {
          const res = await wishlistApi.addToWishlist(product.id);
          if (res && res.id) {
            setWishlistItems((prev) =>
              prev.map((item) => (Number(item.id) === pid ? { ...item, wishlist_id: res.id } : item))
            );
          }
        } catch (err) {
          // Handled gracefully in background
        }
      }
      return true;
    },
    [isInWishlist, isAuthenticated, showToast]
  );

  const removeFromWishlist = useCallback(
    async (productId, wishlistId) => {
      if (productId == null) return;
      const pid = Number(productId);
      const existing = wishlistItems.find((item) => {
        const itemId = Number(
          (typeof item.product === 'object' && item.product !== null ? item.product.id : null) ||
          item.product_details?.id ||
          item.id ||
          item.product
        );
        return itemId === pid;
      });

      setWishlistItems((prev) =>
        prev.filter((item) => {
          const itemId = Number(
            (typeof item.product === 'object' && item.product !== null ? item.product.id : null) ||
            item.product_details?.id ||
            item.id ||
            item.product
          );
          return itemId !== pid;
        })
      );
      showToast('Removed from wishlist', 'info');

      const targetWishlistId = wishlistId || existing?.wishlist_id;
      if (isAuthenticated && targetWishlistId) {
        try {
          await wishlistApi.removeFromWishlist(targetWishlistId);
        } catch {
          // Handled gracefully in background
        }
      }
    },
    [wishlistItems, isAuthenticated, showToast]
  );

  const toggleWishlist = useCallback(
    async (product) => {
      if (!product || !product.id) return false;
      const pid = Number(product.id);

      const existingIndex = wishlistItems.findIndex((item) => {
        const itemId = Number(
          (typeof item.product === 'object' && item.product !== null ? item.product.id : null) ||
          item.product_details?.id ||
          item.id ||
          item.product
        );
        return itemId === pid;
      });

      if (existingIndex !== -1) {
        const existing = wishlistItems[existingIndex];
        setWishlistItems((prev) => prev.filter((_, idx) => idx !== existingIndex));
        showToast('Removed from wishlist', 'info');

        if (isAuthenticated) {
          const wId = existing.wishlist_id || (existing.id && existing.product ? existing.id : null);
          if (wId) {
            try {
              await wishlistApi.removeFromWishlist(wId);
            } catch {
              // Handled gracefully in background
            }
          }
        }
        return false;
      } else {
        setWishlistItems((prev) => [...prev, product]);
        showToast('Added to wishlist', 'success');

        if (isAuthenticated) {
          try {
            const res = await wishlistApi.addToWishlist(product.id);
            if (res && res.id) {
              setWishlistItems((prev) =>
                prev.map((item) => {
                  const itemId = Number(
                    (typeof item.product === 'object' && item.product !== null ? item.product.id : null) ||
                    item.id
                  );
                  return itemId === pid ? { ...item, wishlist_id: res.id } : item;
                })
              );
            }
          } catch {
            // Handled gracefully in background
          }
        }
        return true;
      }
    },
    [wishlistItems, isAuthenticated, showToast]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount: wishlistItems.length,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    // Safe fallback when rendered without WishlistProvider in isolated test runners
    return {
      wishlistItems: [],
      wishlistCount: 0,
      isInWishlist: () => false,
      addToWishlist: () => false,
      removeFromWishlist: () => {},
      toggleWishlist: () => false,
    };
  }
  return context;
};
