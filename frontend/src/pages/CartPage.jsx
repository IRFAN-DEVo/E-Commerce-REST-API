import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedContent } from '../components/common/AnimatedContent';
import { getProductImageUrl } from '../utils/imageUrl';

export const CartPage = () => {
  const { cartItems, totalItems, totalPrice, isLoading, updateItem, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '5rem 0', maxWidth: '500px', textAlign: 'center' }}>
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
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#000000',
            }}
          >
            <ShoppingBag size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000', marginBottom: '0.5rem' }}>
            Sign in to view your cart
          </h2>
          <p style={{ color: '#71717a', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            Your cart items are synchronized with your account across all devices.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Sign In
          </Link>
        </AnimatedContent>
      </div>
    );
  }

  if (isLoading && cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <LoadingSpinner message="Loading your cart..." />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '5rem 0', maxWidth: '500px', textAlign: 'center' }}>
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
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#000000',
            }}
          >
            <ShoppingBag size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000', marginBottom: '0.5rem' }}>
            Your shopping cart is empty
          </h2>
          <p style={{ color: '#71717a', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            Looks like you haven't added any items to your bag yet.
          </p>
          <Link to="/products" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Start Shopping
          </Link>
        </AnimatedContent>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '3rem 0 6rem 0' }}>
      <div className="container">
        {/* Title matching Screenshot #4 with AnimatedContent */}
        <AnimatedContent
          distance={20}
          direction="vertical"
          duration={0.55}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
        >
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#000000',
              letterSpacing: '-0.025em',
              marginBottom: '2rem',
            }}
          >
            Shopping Cart ({totalItems})
          </h1>
        </AnimatedContent>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1fr',
            gap: '3rem',
            alignItems: 'start',
          }}
          className="cart-grid"
        >
          {/* Left Column: Items Table List (Screenshot #4) */}
          <AnimatedContent
            distance={30}
            direction="horizontal"
            duration={0.65}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
          >
            <div>
              {/* Table Header Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 1fr 1fr 40px',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
              className="cart-table-header"
            >
              <div>Product</div>
              <div style={{ textAlign: 'center' }}>Price</div>
              <div style={{ textAlign: 'center' }}>Quantity</div>
              <div style={{ textAlign: 'right' }}>Total</div>
              <div></div>
            </div>

            {/* Cart Items Rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {cartItems.map((item) => {
                const product = item.product || {};
                const itemPrice = product.discount_price && Number(product.discount_price) < Number(product.price)
                  ? product.discount_price
                  : product.price;

                const itemSubtotal = (Number(itemPrice) * item.quantity).toFixed(2);

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2.5fr 1fr 1fr 1fr 40px',
                      alignItems: 'center',
                      padding: '1.5rem 0',
                      borderBottom: '1px solid #f4f4f5',
                      gap: '0.75rem',
                    }}
                    className="cart-item-row"
                  >
                    {/* Product Info (Thumbnail + Name) */}
                    <div className="cart-item-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                      <Link
                        to={`/products/${product.id}`}
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '8px',
                          backgroundColor: '#f4f4f5',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                          padding: '0.5rem',
                        }}
                      >
                        {product.image ? (
                          <img
                            src={getProductImageUrl(product.image)}
                            alt={product.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>No Img</span>
                        )}
                      </Link>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link
                          to={`/products/${product.id}`}
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color: '#000000',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            lineHeight: 1.35,
                          }}
                        >
                          {product.name}
                        </Link>
                        {product.brand_name && (
                          <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem' }}>
                            {product.brand_name}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem' }}>
                          Unit Price: ₹{Number(itemPrice || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.1rem' }}>
                          Subtotal: ₹{Number(item.sub_total || itemSubtotal || 0).toFixed(2)}
                        </div>
                        {product.stock !== undefined && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: product.stock < item.quantity ? '#dc2626' : '#71717a',
                              marginTop: '0.2rem',
                              fontWeight: product.stock < item.quantity ? 600 : 400,
                            }}
                          >
                            {product.stock < item.quantity
                              ? `Only ${product.stock} left in stock! Please adjust quantity.`
                              : `Stock: ${product.stock} available`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unit Price (Desktop Only column) */}
                    <div
                      className="cart-desktop-cell"
                      style={{ textAlign: 'center', fontSize: '0.9375rem', fontWeight: 500, color: '#000000' }}
                    >
                      ₹{Number(itemPrice || 0).toFixed(2)}
                    </div>

                    {/* Quantity Selector + Total + Remove on Mobile Bottom Bar / Desktop Columns */}
                    <div className="cart-mobile-actions-wrapper">
                      {/* Quantity Selector */}
                      <div className="cart-qty-container" style={{ display: 'flex', justifyContent: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
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
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              color: '#000000',
                              minWidth: '32px',
                              minHeight: '32px',
                            }}
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span style={{ padding: '0.35rem 0.5rem', minWidth: '28px', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateItem(item.id, item.quantity + 1)}
                            disabled={isLoading || (product.stock !== undefined && item.quantity >= product.stock)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              color: '#000000',
                              minWidth: '32px',
                              minHeight: '32px',
                            }}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="cart-item-subtotal-cell" style={{ textAlign: 'right', fontSize: '0.9375rem', fontWeight: 700, color: '#000000' }}>
                        ₹{itemSubtotal}
                      </div>

                      {/* Remove Action */}
                      <div className="cart-item-trash-cell" style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          className="touch-target"
                          style={{
                            color: '#a1a1aa',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 150ms ease',
                            background: 'none',
                            border: 'none',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
                          aria-label={`Remove ${product.name} from cart`}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continue Shopping Link (Screenshot #4) */}
            <div style={{ marginTop: '2rem' }}>
              <Link
                to="/products"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#000000',
                  textDecoration: 'none',
                }}
              >
                <ArrowLeft size={16} />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        </AnimatedContent>

        {/* Right Column: Order Summary Card (Screenshot #4) */}
        <AnimatedContent
          distance={30}
          direction="horizontal"
          reverse
          duration={0.65}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
          delay={0.08}
        >
          <div
            className="card"
            style={{
              padding: '1.75rem',
              backgroundColor: '#fafafa',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              position: 'sticky',
              top: '5.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#000000',
                letterSpacing: '-0.02em',
                marginBottom: '1.5rem',
              }}
            >
              Order Summary
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#000000' }}>₹{Number(totalPrice).toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                <span>Shipping</span>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>Free</span>
              </div>

              <div
                style={{
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '1rem',
                  marginTop: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: '#000000',
                }}
              >
                <span>Total</span>
                <span>₹{Number(totalPrice).toFixed(2)}</span>
              </div>
            </div>

            {/* Proceed to Checkout Button (Solid Black with Arrow, Screenshot #4) */}
            <div style={{ marginTop: '1.75rem' }}>
              <button
                onClick={() => navigate('/checkout')}
                disabled={isLoading || cartItems.some((i) => i.product?.stock !== undefined && i.quantity > i.product?.stock)}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Secure Checkout Badge (Screenshot #4) */}
            <div
              style={{
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#71717a',
              }}
            >
              <Lock size={14} color="#71717a" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </AnimatedContent>
      </div>
    </div>

    <style>{`
      .cart-mobile-actions-wrapper {
        display: contents;
      }
      @media (max-width: 768px) {
        .cart-grid {
          grid-template-columns: 1fr !important;
          gap: 2rem !important;
        }
        .cart-table-header,
        .cart-desktop-cell {
          display: none !important;
        }
        .cart-item-row {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 0.875rem !important;
          padding: 1.25rem 0 !important;
        }
        .cart-mobile-actions-wrapper {
          display: flex !important;
          align-items: center !important;
          justifyContent: space-between !important;
          width: 100% !important;
          padding-top: 0.75rem !important;
          border-top: 1px dashed #e5e7eb !important;
        }
      }
    `}</style>
    </div>
  );
};
export default CartPage;
