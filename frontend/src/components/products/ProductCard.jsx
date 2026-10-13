import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { wishlistApi } from '../../api/wishlist';
import { StockBadge } from '../common/Badge';

export const ProductCard = ({ product, inWishlist = false, onWishlistToggle }) => {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.is_available || product.stock <= 0) {
      showToast('This product is currently out of stock.', 'warning');
      return;
    }
    await addItem(product.id, 1);
  };

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Please sign in to save items to your wishlist.', 'warning');
      return;
    }
    try {
      if (onWishlistToggle) {
        onWishlistToggle(product.id);
      } else {
        await wishlistApi.addToWishlist(product.id);
        showToast('Added to your wishlist!', 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update wishlist.';
      showToast(msg, 'info');
    }
  };

  const hasDiscount = product.discount_price && Number(product.discount_price) < Number(product.price);
  const displayPrice = hasDiscount ? product.discount_price : product.price;
  const originalPrice = hasDiscount ? product.price : null;

  return (
    <div className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Product Image & Badges */}
      <Link
        to={`/products/${product.id}`}
        style={{
          position: 'relative',
          paddingTop: '75%',
          backgroundColor: 'var(--gray-100)',
          overflow: 'hidden',
          display: 'block',
        }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform var(--transition-normal)',
            }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
            }}
          >
            No Image
          </div>
        )}

        {/* Stock Badge Overlay */}
        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
          <StockBadge stock={product.stock} isAvailable={product.is_available} />
        </div>

        {/* Wishlist Button Overlay */}
        <button
          onClick={handleWishlistClick}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            color: inWishlist ? 'var(--danger-500)' : 'var(--gray-500)',
            transition: 'transform var(--transition-fast)',
          }}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={18} fill={inWishlist ? 'var(--danger-500)' : 'none'} />
        </button>
      </Link>

      {/* Product Info */}
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.5rem' }}>
        {product.category_name && (
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600, textTransform: 'uppercase' }}>
            {product.category_name}
          </span>
        )}

        <Link
          to={`/products/${product.id}`}
          style={{
            fontWeight: 600,
            fontSize: '1rem',
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </Link>

        {product.brand_name && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Brand: {product.brand_name}
          </span>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                ₹{Number(displayPrice).toFixed(2)}
              </span>
              {originalPrice && (
                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  ₹{Number(originalPrice).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.is_available || product.stock <= 0}
            className="btn btn-primary btn-sm"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
