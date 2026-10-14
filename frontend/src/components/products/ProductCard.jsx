import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { wishlistApi } from '../../api/wishlist';
import { useWishlist } from '../../context/WishlistContext';
import { StockBadge } from '../common/Badge';
import { StarRating } from '../common/StarRating';

export const ProductCard = ({ product, inWishlist = false, onWishlistToggle }) => {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist } = useWishlist();

  const isFavorited = inWishlist || (product?.id != null && isInWishlist(product.id));

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
    if (onWishlistToggle) {
      onWishlistToggle(product.id);
      return;
    }
    if (toggleWishlist) {
      await toggleWishlist(product);
    } else if (isFavorited) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  };

  const hasDiscount = product.discount_price && Number(product.discount_price) < Number(product.price);
  const displayPrice = hasDiscount ? product.discount_price : product.price;
  const originalPrice = hasDiscount ? product.price : null;

  const discountPercent = hasDiscount && product.price
    ? Math.round(((Number(product.price) - Number(product.discount_price)) / Number(product.price)) * 100)
    : null;

  const rating = product.rating || product.average_rating || 4.5;
  const reviewsCount = product.reviews_count || product.num_reviews || 24;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.06)';
        e.currentTarget.style.borderColor = '#111111';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      {/* Product Image & Badges Container */}
      <Link
        to={`/products/${product.id}`}
        style={{
          position: 'relative',
          paddingTop: '85%',
          backgroundColor: '#f4f4f5',
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
              objectFit: 'contain',
              padding: '1rem',
              transition: 'transform 250ms ease',
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
              color: '#a1a1aa',
              fontSize: '0.875rem',
            }}
          >
            No Image
          </div>
        )}

        {/* Top Badges (Discount / Stock) */}
        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.375rem' }}>
          {discountPercent ? (
            <span
              style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                letterSpacing: '0.02em',
              }}
            >
              {discountPercent}% OFF
            </span>
          ) : null}
          <StockBadge stock={product.stock} isAvailable={product.is_available} />
        </div>

        {/* Wishlist Button Overlay */}
        <button
          onClick={handleWishlistClick}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            backgroundColor: isFavorited ? '#fff1f2' : '#ffffff',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isFavorited ? '0 2px 8px rgba(225, 29, 72, 0.2)' : '0 2px 6px rgba(0,0,0,0.08)',
            border: isFavorited ? '1px solid #fecdd3' : '1px solid #e5e7eb',
            color: isFavorited ? '#e11d48' : '#18181b',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            zIndex: 3,
          }}
          aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
          title={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={16}
            fill={isFavorited ? '#e11d48' : 'none'}
            stroke={isFavorited ? '#e11d48' : '#18181b'}
            strokeWidth={2}
          />
        </button>
      </Link>

      {/* Product Information */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.375rem' }}>
        {/* Category & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#71717a' }}>
          {product.category_name && (
            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {product.category_name}
            </span>
          )}
          {product.category_name && product.brand_name && <span>•</span>}
          {product.brand_name && (
            <span>
              {product.brand_name}
            </span>
          )}
        </div>

        {/* Title */}
        <Link
          to={`/products/${product.id}`}
          style={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: '#111111',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginTop: '0.25rem',
            textDecoration: 'none',
          }}
        >
          {product.name}
        </Link>

        {/* Ratings Display matching Mockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', margin: '0.25rem 0' }}>
          <StarRating rating={Math.round(rating)} size={14} />
          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>({reviewsCount})</span>
        </div>

        {/* Price & Action Bottom Row */}
        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#000000' }}>
              ₹{Number(displayPrice).toFixed(2)}
            </span>
            {originalPrice && (
              <span style={{ textDecoration: 'line-through', color: '#a1a1aa', fontSize: '0.8125rem' }}>
                ₹{Number(originalPrice).toFixed(2)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.is_available || product.stock <= 0}
            className="btn btn-primary"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              borderRadius: '4px',
              backgroundColor: '#000000',
              color: '#ffffff',
            }}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart size={14} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ProductCard;
