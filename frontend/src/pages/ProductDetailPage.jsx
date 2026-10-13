import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, MessageSquarePlus, ChevronRight } from 'lucide-react';
import { productsApi } from '../api/products';
import { reviewsApi } from '../api/reviews';
import { wishlistApi } from '../api/wishlist';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StockBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StarRating } from '../components/common/StarRating';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('8');
  const [selectedColor, setSelectedColor] = useState('black');
  const [activeTab, setActiveTab] = useState('description');
  const [isLoading, setIsLoading] = useState(true);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      productsApi.getProduct(id),
      reviewsApi.getProductReviews(id).catch(() => []),
    ])
      .then(([prodData, revData]) => {
        if (isMounted) {
          setProduct(prodData);
          setReviews(Array.isArray(revData) ? revData : revData?.results || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          showToast('Product not found.', 'error');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, showToast]);

  const handleAddToCart = async () => {
    if (!product) return;
    await addItem(product.id, quantity);
  };

  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to save items to your wishlist.', 'warning');
      return;
    }
    try {
      await wishlistApi.addToWishlist(product.id);
      showToast('Product added to wishlist!', 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Item already in wishlist.';
      showToast(msg, 'info');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showToast('Please provide a comment for your review.', 'warning');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await reviewsApi.createReview({
        product: product.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      showToast('Thank you! Your review has been submitted.', 'success');
      setReviewComment('');
      const revData = await reviewsApi.getProductReviews(id);
      setReviews(Array.isArray(revData) ? revData : revData?.results || []);
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.non_field_errors?.[0] ||
        'Unable to submit review. You must have purchased this item.';
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <LoadingSpinner message="Loading product details..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#000000' }}>Product Not Found</h2>
        <p style={{ color: '#71717a', margin: '1rem 0 2rem' }}>
          The product you are looking for does not exist or has been moved.
        </p>
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const hasDiscount = product.discount_price && Number(product.discount_price) < Number(product.price);
  const displayPrice = hasDiscount ? product.discount_price : product.price;
  const discountPercent = hasDiscount && product.price
    ? Math.round(((Number(product.price) - Number(product.discount_price)) / Number(product.price)) * 100)
    : null;

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : '4.8';

  const sizes = ['5', '6', '7', '8', '9', '10', '11'];
  const colors = [
    { id: 'black', hex: '#000000', name: 'Black' },
    { id: 'white', hex: '#f4f4f5', name: 'White', border: true },
    { id: 'gray', hex: '#71717a', name: 'Slate Gray' },
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '2rem 0 5rem 0' }}>
      <div className="container">
        {/* Breadcrumb Navigation (Screenshot #3) */}
        <nav className="breadcrumb-nav">
          <Link to="/">Home</Link>
          <ChevronRight size={14} className="breadcrumb-separator" />
          <Link to="/products">Shop</Link>
          {product.category_name && (
            <>
              <ChevronRight size={14} className="breadcrumb-separator" />
              <Link to={`/products?category=${encodeURIComponent(product.category_name)}`}>
                {product.category_name}
              </Link>
            </>
          )}
          <ChevronRight size={14} className="breadcrumb-separator" />
          <span className="breadcrumb-current">{product.name}</span>
        </nav>

        {/* Main Product Presentation (Screenshot #3) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: '3.5rem',
            alignItems: 'start',
            marginBottom: '4rem',
          }}
          className="product-detail-grid"
        >
          {/* Left Column: Image Display */}
          <div style={{ display: 'flex', gap: '1rem' }} className="gallery-container">
            {/* Main Featured Image Container */}
            <div
              style={{
                flex: 1,
                backgroundColor: '#f4f4f5',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                aspectRatio: '1/1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem',
                position: 'relative',
              }}
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div style={{ color: '#a1a1aa' }}>No Image Available</div>
              )}

              {/* Discount Badge */}
              {discountPercent && (
                <span
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '4px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Information, Options, & Actions (Screenshot #3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Title & Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                {product.brand_name && (
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {product.brand_name}
                  </span>
                )}
                {product.category_name && <span style={{ color: '#d4d4d8' }}>•</span>}
                {product.category_name && (
                  <span style={{ fontSize: '0.8125rem', color: '#71717a' }}>{product.category_name}</span>
                )}
              </div>

              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#000000',
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                }}
              >
                {product.name}
              </h1>
            </div>

            {/* Ratings & Reviews summary (Screenshot #3) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StarRating rating={Math.round(Number(averageRating))} size={16} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000' }}>({averageRating})</span>
              <span style={{ color: '#71717a', fontSize: '0.875rem' }}>• {reviews.length} reviews</span>
            </div>

            {/* Price Display */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', margin: '0.25rem 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#000000' }}>
                ₹{Number(displayPrice).toFixed(2)}
              </span>
              {hasDiscount && (
                <span style={{ fontSize: '1.25rem', textDecoration: 'line-through', color: '#a1a1aa' }}>
                  ₹{Number(product.price).toFixed(2)}
                </span>
              )}
              {discountPercent && (
                <span
                  style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Short Excerpt */}
            <p style={{ color: '#52525b', fontSize: '0.9375rem', lineHeight: '1.6' }}>
              {product.description || 'Lightweight, breathable and designed for maximum comfort and style. Perfect for everyday performance.'}
            </p>

            {/* Color Swatch Selector (Screenshot #3) */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', marginBottom: '0.625rem' }}>
                Color
              </div>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                {colors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      border: c.border ? '1px solid #d4d4d8' : 'none',
                      outline: selectedColor === c.id ? '2px solid #000000' : 'none',
                      outlineOffset: '2px',
                      cursor: 'pointer',
                      transition: 'outline 150ms ease',
                    }}
                    title={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Selector Chips (Screenshot #3) */}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000', marginBottom: '0.625rem' }}>
                Size
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {sizes.map((s) => {
                  const isSelected = selectedSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      style={{
                        minWidth: '38px',
                        height: '38px',
                        padding: '0 0.625rem',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? 600 : 500,
                        backgroundColor: isSelected ? '#000000' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#111111',
                        border: isSelected ? '1px solid #000000' : '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector + Add to Cart + Wishlist (Screenshot #3) */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {product.is_available && product.stock > 0 ? (
                <>
                  {/* Quantity Counter */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{
                        padding: '0.625rem 0.875rem',
                        fontSize: '1rem',
                        color: '#000000',
                        cursor: 'pointer',
                      }}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span style={{ padding: '0.625rem 0.5rem', fontWeight: 600, minWidth: '32px', textAlign: 'center' }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                      style={{
                        padding: '0.625rem 0.875rem',
                        fontSize: '1rem',
                        color: '#000000',
                        cursor: 'pointer',
                      }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Black Button */}
                  <button
                    onClick={handleAddToCart}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.9375rem',
                      borderRadius: '6px',
                    }}
                  >
                    <ShoppingCart size={18} />
                    <span>Add to Cart</span>
                  </button>
                </>
              ) : (
                <button
                  disabled
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.9375rem',
                    borderRadius: '6px',
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }}
                >
                  Currently Out of Stock
                </button>
              )}

              {/* Wishlist Button */}
              <button
                onClick={handleAddToWishlist}
                className="btn btn-secondary"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                }}
                title="Add to Wishlist"
                aria-label="Save to Wishlist"
              >
                <Heart size={20} />
              </button>
            </div>

            {/* Trust Badges (Screenshot #3) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '1.5rem',
                marginTop: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={18} color="#000000" />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000' }}>Free Shipping</div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a' }}>On orders over $50</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={18} color="#000000" />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000' }}>7 Days Return</div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Easy returns</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="#000000" />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000' }}>Secure Payment</div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a' }}>100% secure</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Info Section: Description / Specifications / Reviews (Screenshot #3) */}
        <section style={{ borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
          <div className="tabs-underline" style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => setActiveTab('description')}
              className={`tab-underline-btn ${activeTab === 'description' ? 'active' : ''}`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`tab-underline-btn ${activeTab === 'specs' ? 'active' : ''}`}
            >
              Specifications
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`tab-underline-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            >
              Reviews ({reviews.length})
            </button>
          </div>

          {/* Tab 1: Full Description */}
          {activeTab === 'description' && (
            <div style={{ maxWidth: '800px', color: '#52525b', lineHeight: '1.8', fontSize: '0.9375rem' }}>
              <p style={{ whiteSpace: 'pre-line' }}>
                {product.overview ||
                  'These running shoes are built with premium materials to give you the best performance and comfort. The breathable mesh upper keeps your feet cool, while the cushioned sole provides excellent support.'}
              </p>
            </div>
          )}

          {/* Tab 2: Specifications */}
          {activeTab === 'specs' && (
            <div style={{ maxWidth: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 600, color: '#000000', width: '180px' }}>Brand</td>
                    <td style={{ padding: '0.75rem 0', color: '#52525b' }}>{product.brand_name || 'DjangoMart Collection'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 600, color: '#000000' }}>Category</td>
                    <td style={{ padding: '0.75rem 0', color: '#52525b' }}>{product.category_name || 'Standard'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 600, color: '#000000' }}>Availability</td>
                    <td style={{ padding: '0.75rem 0', color: '#52525b' }}>{product.stock > 0 ? `In Stock (${product.stock} units)` : 'Out of Stock'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 600, color: '#000000' }}>Warranty</td>
                    <td style={{ padding: '0.75rem 0', color: '#52525b' }}>1 Year Manufacturer Warranty</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Customer Reviews */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem' }} className="reviews-grid">
              {/* Write Review Form */}
              <div className="card" style={{ padding: '1.75rem', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#000000', marginBottom: '1rem' }}>
                  Write a Review
                </h3>
                {isAuthenticated ? (
                  <form onSubmit={handleSubmitReview}>
                    <div className="form-group">
                      <label className="form-label">Rating</label>
                      <StarRating rating={reviewRating} interactive={true} onRate={setReviewRating} size={22} />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Comment</label>
                      <textarea
                        rows={4}
                        className="form-textarea"
                        placeholder="Write your honest review..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" disabled={isSubmittingReview} className="btn btn-primary" style={{ width: '100%' }}>
                      {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <p style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '1rem' }}>
                      Sign in to your account to review this product.
                    </p>
                    <Link to="/login" className="btn btn-secondary" style={{ width: '100%' }}>
                      Sign In
                    </Link>
                  </div>
                )}
              </div>

              {/* Reviews List */}
              <div>
                {reviews.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviews.map((rev) => (
                      <div key={rev.id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                          <span style={{ fontWeight: 600, color: '#000000', fontSize: '0.9375rem' }}>{rev.user}</span>
                          <StarRating rating={rev.rating} size={14} />
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#52525b', lineHeight: '1.6' }}>{rev.comment}</p>
                        {rev.created_at && (
                          <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#71717a', fontSize: '0.875rem' }}>
                    No reviews yet. Be the first to review this product!
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .product-detail-grid, .reviews-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
};
export default ProductDetailPage;
