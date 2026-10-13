import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const CartPage = () => {
  const { cartItems, totalItems, totalPrice, isLoading, updateItem, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <EmptyState
          icon={ShoppingBag}
          title="Sign in to view your cart"
          description="Your cart items are synchronized with your account across all sessions."
          actionText="Sign In"
          actionLink="/login"
        />
      </div>
    );
  }

  if (isLoading && cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading your cart..." />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <EmptyState
          icon={ShoppingBag}
          title="Your shopping cart is empty"
          description="Looks like you haven't added any products to your cart yet."
          actionText="Start Shopping"
          actionLink="/products"
        />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '2rem' }}>
        Shopping Cart ({totalItems} items)
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.8fr) minmax(280px, 1fr)',
          gap: '2.5rem',
          alignItems: 'start',
        }}
        className="cart-layout"
      >
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cartItems.map((item) => {
            const product = item.product || {};
            const itemPrice = product.discount_price && Number(product.discount_price) < Number(product.price)
              ? product.discount_price
              : product.price;

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                }}
              >
                {/* Product Thumbnail */}
                <Link
                  to={`/products/${product.id}`}
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--gray-100)',
                    flexShrink: 0,
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Image</span>
                  )}
                </Link>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    to={`/products/${product.id}`}
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
                    {product.name}
                  </Link>

                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Unit Price: ₹{Number(itemPrice || 0).toFixed(2)}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>
                    Subtotal: ₹{Number(item.sub_total || 0).toFixed(2)}
                  </div>

                  {product.stock !== undefined && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: product.stock < item.quantity ? 'var(--error-600)' : 'var(--text-muted)',
                        marginTop: '0.25rem',
                        fontWeight: product.stock < item.quantity ? 600 : 400,
                      }}
                    >
                      {product.stock < item.quantity
                        ? `Only ${product.stock} available in stock! Please adjust quantity.`
                        : `Stock: ${product.stock} available`}
                    </div>
                  )}
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid var(--gray-300)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <button
                      onClick={() => {
                        if (item.quantity > 1) {
                          updateItem(item.id, item.quantity - 1);
                        } else {
                          removeItem(item.id);
                        }
                      }}
                      disabled={isLoading}
                      style={{ padding: '0.375rem 0.625rem', fontWeight: 600, opacity: isLoading ? 0.6 : 1 }}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ padding: '0.375rem 0.5rem', minWidth: '32px', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      disabled={isLoading || (product.stock !== undefined && item.quantity >= product.stock)}
                      style={{
                        padding: '0.375rem 0.625rem',
                        fontWeight: 600,
                        opacity: isLoading || (product.stock !== undefined && item.quantity >= product.stock) ? 0.5 : 1,
                        cursor: product.stock !== undefined && item.quantity >= product.stock ? 'not-allowed' : 'pointer',
                      }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={isLoading}
                    style={{
                      padding: '0.5rem',
                      color: 'var(--gray-400)',
                      transition: 'color var(--transition-fast)',
                      opacity: isLoading ? 0.5 : 1,
                    }}
                    title="Remove item"
                    aria-label={`Remove ${product.name} from cart`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Card */}
        <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '5.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Order Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Total Items</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Estimated Shipping</span>
              <span style={{ fontWeight: 600, color: 'var(--success-600)' }}>FREE</span>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem',
                marginTop: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.25rem',
                fontWeight: 800,
              }}
            >
              <span>Subtotal</span>
              <span>₹{Number(totalPrice).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={() => navigate('/checkout')}
              disabled={isLoading || cartItems.some((i) => i.product?.stock !== undefined && i.quantity > i.product?.stock)}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Coupons and payment details are finalized securely during checkout.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .cart-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
