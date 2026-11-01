import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { wishlistApi } from '../api/wishlist';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { LoginRequiredModal } from '../components/common/LoginRequiredModal';
import { PendingWishlistConfirmModal } from '../components/common/PendingWishlistConfirmModal';

const WishlistContext = createContext(null);

const PENDING_STORAGE_KEY = 'djangomart_pending_wishlist';

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const [loadingIds, setLoadingIds] = useState(new Set());

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingConfirmProduct, setPendingConfirmProduct] = useState(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Helper to extract numeric product id from an item
  const getProductId = useCallback((item) => {
    if (!item) return null;
    if (typeof item.product === 'object' && item.product !== null && item.product.id != null) {
      return Number(item.product.id);
    }
    if (item.product_details?.id != null) {
      return Number(item.product_details.id);
    }
    if (item.product != null && typeof item.product !== 'object') {
      return Number(item.product);
    }
    if (item.id != null) {
      return Number(item.id);
    }
    return null;
  }, []);

  const isInWishlist = useCallback(
    (productId) => {
      if (!isAuthenticated || productId == null) return false;
      const targetId = Number(productId);
      return wishlistItems.some((item) => getProductId(item) === targetId);
    },
    [isAuthenticated, wishlistItems, getProductId]
  );

  const isItemLoading = useCallback(
    (productId) => {
      if (productId == null) return false;
      return loadingIds.has(Number(productId));
    },
    [loadingIds]
  );

  // Sync with backend API when authentication state changes
  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated) {
      setWishlistItems([]);
      setIsLoadingWishlist(false);
      setPendingConfirmProduct(null);
      setIsConfirmModalOpen(false);
      return;
    }

    setIsLoadingWishlist(true);
    wishlistApi
      .getWishlist()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setWishlistItems(list);

        // Check for pending wishlist item saved prior to authentication
        try {
          const savedPending = sessionStorage.getItem(PENDING_STORAGE_KEY);
          if (savedPending) {
            const parsed = JSON.parse(savedPending);
            const pendingPid = Number(parsed.id);
            const alreadyInList = list.some((item) => getProductId(item) === pendingPid);
            if (alreadyInList) {
              sessionStorage.removeItem(PENDING_STORAGE_KEY);
            } else {
              setPendingConfirmProduct(parsed);
              setIsConfirmModalOpen(true);
            }
          }
        } catch {
          // Ignore storage read errors
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // Non-intrusive error handling
        setWishlistItems([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingWishlist(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, getProductId]);

  const addToWishlist = useCallback(
    async (product) => {
      if (!product || product.id == null) return false;
      const pid = Number(product.id);

      // 1. Unauthenticated guest check
      if (!isAuthenticated) {
        try {
          sessionStorage.setItem(
            PENDING_STORAGE_KEY,
            JSON.stringify({
              id: pid,
              name: product.name || 'Selected product',
              product: {
                id: pid,
                name: product.name,
                price: product.price,
                image: product.image,
              },
            })
          );
        } catch {
          // Ignore storage quota errors
        }
        setPendingProduct(product);
        setIsLoginModalOpen(true);
        return false;
      }

      // 2. Prevent concurrent / duplicate requests
      if (loadingIds.has(pid)) return false;

      if (isInWishlist(pid)) {
        showToast('Already in your wishlist', 'info');
        return false;
      }

      // 3. Mark in-flight
      setLoadingIds((prev) => new Set(prev).add(pid));

      // 4. Optimistic UI update
      const tempId = `temp-${Date.now()}-${pid}`;
      const optimisticItem = {
        id: tempId,
        product: pid,
        product_details: product,
      };

      setWishlistItems((prev) => [optimisticItem, ...prev]);
      showToast('Added to wishlist', 'success');

      try {
        const res = await wishlistApi.addToWishlist(pid);
        // Replace temp item with real saved instance
        setWishlistItems((prev) =>
          prev.map((item) =>
            item.id === tempId ? { ...item, id: res.id, wishlist_id: res.id, ...res } : item
          )
        );
        return true;
      } catch (err) {
        // Rollback on failure
        setWishlistItems((prev) => prev.filter((item) => item.id !== tempId));
        const errMsg =
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          'Failed to add product to wishlist.';
        showToast(errMsg, 'error');
        return false;
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
      }
    },
    [isAuthenticated, loadingIds, isInWishlist, showToast]
  );

  const removeFromWishlist = useCallback(
    async (productId, wishlistId) => {
      if (!isAuthenticated || productId == null) return false;
      const pid = Number(productId);

      if (loadingIds.has(pid)) return false;

      const existingIndex = wishlistItems.findIndex((item) => getProductId(item) === pid);
      if (existingIndex === -1) return false;

      const existingItem = wishlistItems[existingIndex];
      const targetWishlistId = wishlistId || existingItem.wishlist_id || existingItem.id;

      // Mark in-flight
      setLoadingIds((prev) => new Set(prev).add(pid));

      // Optimistic removal
      setWishlistItems((prev) => prev.filter((_, idx) => idx !== existingIndex));
      showToast('Removed from wishlist', 'info');

      try {
        await wishlistApi.removeFromWishlist(targetWishlistId || pid);
        return true;
      } catch (err) {
        // Rollback on failure: restore previous item at original position
        setWishlistItems((prev) => {
          const restored = [...prev];
          restored.splice(existingIndex, 0, existingItem);
          return restored;
        });
        showToast('Failed to remove item from wishlist.', 'error');
        return false;
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
      }
    },
    [isAuthenticated, loadingIds, wishlistItems, getProductId, showToast]
  );

  const toggleWishlist = useCallback(
    async (product) => {
      if (!product || product.id == null) return false;
      const pid = Number(product.id);

      if (!isAuthenticated) {
        return addToWishlist(product);
      }

      if (isInWishlist(pid)) {
        await removeFromWishlist(pid);
        return false;
      } else {
        await addToWishlist(product);
        return true;
      }
    },
    [isAuthenticated, isInWishlist, addToWishlist, removeFromWishlist]
  );

  // Pending wishlist confirmation handlers
  const handleConfirmPendingWishlist = useCallback(async () => {
    if (!pendingConfirmProduct) {
      setIsConfirmModalOpen(false);
      return;
    }
    setIsConfirmLoading(true);
    try {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      await addToWishlist(
        pendingConfirmProduct.product || {
          id: pendingConfirmProduct.id,
          name: pendingConfirmProduct.name,
        }
      );
    } finally {
      setIsConfirmLoading(false);
      setIsConfirmModalOpen(false);
      setPendingConfirmProduct(null);
    }
  }, [pendingConfirmProduct, addToWishlist]);

  const handleCancelPendingWishlist = useCallback(() => {
    sessionStorage.removeItem(PENDING_STORAGE_KEY);
    setIsConfirmModalOpen(false);
    setPendingConfirmProduct(null);
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await wishlistApi.getWishlist();
      setWishlistItems(Array.isArray(data) ? data : data?.results || []);
    } catch {
      // Ignore
    }
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      wishlistItems,
      wishlistCount: wishlistItems.length,
      isLoadingWishlist,
      isItemLoading,
      isInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      refreshWishlist,
    }),
    [
      wishlistItems,
      isLoadingWishlist,
      isItemLoading,
      isInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      refreshWishlist,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}

      {/* Guest Login Required Modal */}
      <LoginRequiredModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingProduct(null);
        }}
        product={pendingProduct}
      />

      {/* Pending Wishlist Confirmation Modal after Login */}
      <PendingWishlistConfirmModal
        isOpen={isConfirmModalOpen}
        productName={pendingConfirmProduct?.name}
        onConfirm={handleConfirmPendingWishlist}
        onCancel={handleCancelPendingWishlist}
        isLoading={isConfirmLoading}
      />
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
      isLoadingWishlist: false,
      isItemLoading: () => false,
      isInWishlist: () => false,
      addToWishlist: () => false,
      removeFromWishlist: () => {},
      toggleWishlist: () => false,
      refreshWishlist: () => {},
    };
  }
  return context;
};
