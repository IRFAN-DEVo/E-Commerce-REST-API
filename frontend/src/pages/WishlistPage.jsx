import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { wishlistApi } from '../api/wishlist';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const WishlistPage = () => {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const [backendItems, setBackendItems] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();
  const { showToast } = useToast();

  const loadWishlist = async () => {
    setIsLoading(true);
    try {
      const data = await wishlistApi.getWishlist();
      setBackendItems(Array.isArray(data) ? data : data?.results || []);
    } catch {
      // Backend not authenticated or unavailable; fallback to WishlistContext
      setBackendItems(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const items = backendItems && backendItems.length > 0 ? backendItems : wishlistItems;

  const handleRemove = async (id, productId) => {
    try {
      await removeFromWishlist(productId || id, id);
      setBackendItems((prev) => (prev ? prev.filter((item) => item.id !== id) : null));
    } catch {
      showToast('Failed to remove item.', 'error');
    }
  };

  const handleMoveToCart = async (productId, wishlistId) => {
    const success = await addItem(productId, 1);
    if (success) {
      await removeFromWishlist(productId, wishlistId);
      setBackendItems((prev) => (prev ? prev.filter((item) => item.id !== wishlistId) : null));
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: 'clamp(2.5rem, 5vw, 4.5rem) 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '1240px' }}>
        {/* Editorial Standalone Header with AnimatedContent */}
        <AnimatedContent
          distance={20}
          direction="vertical"
          duration={0.55}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
        >
          <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <span
                style={{
                  backgroundColor: '#d4ff00',
                  color: '#0a0a0a',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                SAVED ARCHIVE
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#71717a',
                }}
              >
                PERSONAL WISHLIST
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: '#0a0a0a',
                    lineHeight: 1.1,
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  My Wishlist
                </h1>
                <p style={{ color: '#71717a', fontSize: '0.9375rem', margin: '0.5rem 0 0', fontWeight: 500 }}>
                  {items.length === 0
                    ? 'Your saved wishlist is currently empty.'
                    : `You have ${items.length} ${items.length === 1 ? 'item' : 'items'} saved in your collection.`}
                </p>
              </div>

              {items.length > 0 && (
                <Link
                  to="/products"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#0a0a0a',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderBottom: '2px solid #0a0a0a',
                    paddingBottom: '2px',
                  }}
                >
                  <span>Continue Shopping</span>
                  <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        </AnimatedContent>

        {/* Content Body */}
        {isLoading ? (
          <div style={{ padding: '6rem 0' }}>
            <LoadingSpinner message="Loading your saved items..." />
          </div>
        ) : items.length === 0 ? (
          <AnimatedContent
            distance={30}
            direction="vertical"
            duration={0.6}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: 'clamp(3rem, 6vw, 5rem) 2rem',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '2rem auto 0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: '#0a0a0a',
                }}
              >
                <Heart size={30} strokeWidth={1.75} />
              </div>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#0a0a0a',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                Your wishlist is empty
              </h2>
              <p
                style={{
                  color: '#71717a',
                  fontSize: '0.9375rem',
                  maxWidth: '420px',
                  margin: '0 auto 2rem',
                  lineHeight: 1.5,
                }}
              >
                Save products you love as you explore our curated catalog to purchase later.
              </p>
              <Link
                to="/products"
                className="btn"
                style={{
                  backgroundColor: '#0a0a0a',
                  color: '#ffffff',
                  padding: '0.85rem 2rem',
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                }}
              >
                <span>Browse Catalog</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </AnimatedContent>
        ) : (
          <AnimatedContent
            distance={30}
            direction="vertical"
            duration={0.65}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.75rem',
              }}
            >
              {items.map((item, index) => {
                const product =
                  item.product_details ||
                  (typeof item.product === 'object' && item.product !== null ? item.product : item);
                const productId = product.id || item.product || item.id;
                const wishlistId = item.wishlist_id || (item.product && item.id ? item.id : null);
                const key = item.id || productId || index;

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      transition: 'all 200ms ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0a0a0a';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Image Container */}
                    <div
                      style={{
                        height: '240px',
                        backgroundColor: '#f8f8f8',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        padding: '1.25rem',
                      }}
                    >
                      <Link
                        to={`/products/${productId}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                              transition: 'transform 300ms ease',
                            }}
                          />
                        ) : (
                          <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>No Image</span>
                        )}
                      </Link>

                      {/* Remove Button in top right corner */}
                      <button
                        onClick={() => handleRemove(wishlistId || item.id, productId)}
                        title="Remove from wishlist"
                        aria-label="Remove item"
                        style={{
                          position: 'absolute',
                          top: '0.75rem',
                          right: '0.75rem',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#71717a',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.color = '#71717a';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        padding: '1.25rem',
                        gap: '0.625rem',
                      }}
                    >
                      {product.category_name && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#71717a',
                          }}
                        >
                          {product.category_name}
                        </span>
                      )}

                      <Link
                        to={`/products/${productId}`}
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: '#0a0a0a',
                          textDecoration: 'none',
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {product.name || `Product #${productId}`}
                      </Link>

                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '1.25rem',
                            color: '#0a0a0a',
                            marginBottom: '0.85rem',
                          }}
                        >
                          ₹{Number(product.price || 0).toFixed(2)}
                        </div>

                        <button
                          onClick={() => handleMoveToCart(productId, wishlistId || item.id)}
                          style={{
                            width: '100%',
                            backgroundColor: '#0a0a0a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: '0.65rem 1rem',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            transition: 'background-color 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#262626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#0a0a0a';
                          }}
                        >
                          <ShoppingCart size={15} />
                          <span>Move to Bag</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedContent>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
