import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { wishlistApi } from '../api/wishlist';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const WishlistPage = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();
  const { showToast } = useToast();

  const loadWishlist = async () => {
    setIsLoading(true);
    try {
      const data = await wishlistApi.getWishlist();
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load wishlist items.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (id) => {
    try {
      await wishlistApi.removeFromWishlist(id);
      showToast('Item removed from wishlist.', 'info');
      loadWishlist();
    } catch (err) {
      showToast('Failed to remove item.', 'error');
    }
  };

  const handleMoveToCart = async (productId, wishlistId) => {
    const success = await addItem(productId, 1);
    if (success) {
      await wishlistApi.removeFromWishlist(wishlistId);
      loadWishlist();
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading your saved items..." />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save items you love to revisit or purchase later."
          actionText="Browse Catalog"
          actionLink="/products"
        />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>
        My Wishlist ({items.length})
      </h1>

      <div className="grid-products">
        {items.map((item) => {
          const product = item.product_details || item.product || {};
          const productId = product.id || item.product;

          return (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  height: '200px',
                  backgroundColor: 'var(--gray-100)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No Image</span>
                )}
              </div>

              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.75rem' }}>
                <Link
                  to={`/products/${productId}`}
                  style={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {product.name || `Product #${productId}`}
                </Link>

                {product.price && (
                  <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                    ₹{Number(product.price).toFixed(2)}
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '0.5rem' }}>
                  <button
                    onClick={() => handleMoveToCart(productId, item.id)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <ShoppingCart size={14} />
                    <span>Move to Cart</span>
                  </button>

                  <button
                    onClick={() => handleRemove(item.id)}
                    className="btn btn-secondary btn-sm btn-icon"
                    title="Remove from wishlist"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
