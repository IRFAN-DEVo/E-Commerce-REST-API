import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, MessageSquarePlus } from 'lucide-react';
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
      .catch((err) => {
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
      // Reload reviews
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
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading product details..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Product Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
          The product you are looking for does not exist or has been removed.
        </p>
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const hasDiscount = product.discount_price && Number(product.discount_price) < Number(product.price);
  const displayPrice = hasDiscount ? product.discount_price : product.price;

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Breadcrumbs */}
      <nav style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        <Link to="/">Home</Link> &bull; <Link to="/products">Products</Link> &bull;{' '}
        <span style={{ color: 'var(--text-primary)' }}>{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) minmax(320px, 1.25fr)',
          gap: '3rem',
          marginBottom: '4rem',
        }}
        className="product-detail-layout"
      >
        {/* Product Media Display */}
        <div>
          <div
            className="card"
            style={{
              overflow: 'hidden',
              backgroundColor: 'var(--gray-100)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '380px',
            }}
          >
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                style={{ width: '100%', height: 'auto', maxHeight: '520px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: 'var(--text-muted)', padding: '4rem' }}>No Image Available</div>
            )}
          </div>
        </div>

        {/* Product Details & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            {product.category_name && (
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary-600)', textTransform: 'uppercase' }}>
                {product.category_name}
              </span>
            )}
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: 1.3 }}>
              {product.name}
            </h1>
            {product.brand_name && (
              <div style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Brand: <strong>{product.brand_name}</strong>
              </div>
            )}
          </div>

          {/* Pricing & Stock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                ₹{Number(displayPrice).toFixed(2)}
              </span>
              {hasDiscount && (
                <span style={{ fontSize: '1.25rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                  ₹{Number(product.price).toFixed(2)}
                </span>
              )}
            </div>
            <StockBadge stock={product.stock} isAvailable={product.is_available} />
          </div>

          {/* Description */}
          <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.25rem 0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Description</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {product.description || 'No detailed description available.'}
            </p>
          </div>

          {/* Purchase Actions */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {product.is_available && product.stock > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)' }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ padding: '0.625rem 1rem', fontSize: '1rem', fontWeight: 600 }}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span style={{ padding: '0.625rem 1rem', fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    style={{ padding: '0.625rem 1rem', fontSize: '1rem', fontWeight: 600 }}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button onClick={handleAddToCart} className="btn btn-primary btn-lg" style={{ flex: 1, minWidth: '180px' }}>
                  <ShoppingCart size={20} />
                  <span>Add to Cart</span>
                </button>
              </>
            ) : (
              <button disabled className="btn btn-secondary btn-lg" style={{ flex: 1 }}>
                Currently Out of Stock
              </button>
            )}

            <button
              onClick={handleAddToWishlist}
              className="btn btn-secondary btn-lg btn-icon"
              title="Add to Wishlist"
              aria-label="Save to Wishlist"
            >
              <Heart size={20} />
            </button>
          </div>

          {/* Value Props */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              backgroundColor: 'var(--gray-50)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={16} color="var(--primary-600)" />
              <span>Standard delivery 2-4 days</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={16} color="var(--primary-600)" />
              <span>Verified 100% authentic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Customer Reviews</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Verified purchase feedback ({reviews.length} reviews)
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.5fr)', gap: '3rem' }} className="reviews-layout">
          {/* Submit Review Card */}
          <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MessageSquarePlus size={20} color="var(--primary-600)" />
              <span>Write a Review</span>
            </h3>

            {isAuthenticated ? (
              <form onSubmit={handleSubmitReview}>
                <div className="form-group">
                  <label className="form-label">Your Rating</label>
                  <StarRating rating={reviewRating} interactive={true} onRate={setReviewRating} size={24} />
                </div>

                <div className="form-group">
                  <label className="form-label">Review Comment</label>
                  <textarea
                    rows={4}
                    className="form-textarea"
                    placeholder="Share your experience with this item..."
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
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Please sign in with your account to submit a review for delivered orders.
                </p>
                <Link to="/login" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                  Sign In to Review
                </Link>
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div>
            {reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.map((rev) => (
                  <div key={rev.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{rev.user}</div>
                      <StarRating rating={rev.rating} size={16} />
                    </div>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {rev.comment}
                    </p>
                    {rev.created_at && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No reviews yet. Be the first verified customer to share your thoughts!
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .product-detail-layout, .reviews-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
