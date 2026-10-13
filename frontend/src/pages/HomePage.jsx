import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Tag, ShieldCheck, ShoppingBag } from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/products/ProductCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import heroModelImg from '../assets/hero_model.jpg';

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('new');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      productsApi.getCategories(),
      productsApi.getProducts({ page_size: 8 }),
    ])
      .then(([cats, prods]) => {
        if (isMounted) {
          setCategories(Array.isArray(cats) ? cats : cats?.results || []);
          const prodList = Array.isArray(prods) ? prods : prods?.results || [];
          setFeaturedProducts(prodList);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter or sort based on active tab
  const getDisplayedProducts = () => {
    if (activeTab === 'bestsellers') {
      return [...featuredProducts].reverse();
    }
    if (activeTab === 'toprated') {
      return [...featuredProducts].sort((a, b) => (b.stock || 0) - (a.stock || 0));
    }
    return featuredProducts;
  };

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      {/* 1. Hero Section matching Screenshot #1 */}
      <section
        style={{
          backgroundColor: '#fafafa',
          padding: '4rem 0 5rem 0',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              alignItems: 'center',
              gap: '4rem',
            }}
            className="hero-grid"
          >
            {/* Left Column: Typography & Action */}
            <div style={{ maxWidth: '580px' }}>
              <h1
                style={{
                  fontSize: 'clamp(2.75rem, 5vw, 4.25rem)',
                  fontWeight: 800,
                  color: '#000000',
                  lineHeight: 1.08,
                  letterSpacing: '-0.035em',
                  marginBottom: '1.25rem',
                }}
              >
                Modern Style For Everyday Life
              </h1>

              <p
                style={{
                  fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
                  color: '#52525b',
                  lineHeight: 1.6,
                  marginBottom: '2.5rem',
                  fontWeight: 400,
                }}
              >
                Discover premium products with the best quality and unbeatable prices.
              </p>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link
                  to="/products"
                  className="btn btn-primary"
                  style={{
                    padding: '0.875rem 2rem',
                    fontSize: '0.9375rem',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    fontWeight: 600,
                  }}
                >
                  <span>Shop Now</span>
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/products?category=all"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.875rem 1.75rem',
                    fontSize: '0.9375rem',
                    borderRadius: '9999px',
                  }}
                >
                  Explore Categories
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Visual matching Screenshot #1 */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#f4f4f5',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
                  border: '1px solid #e5e7eb',
                  aspectRatio: '4/3',
                  position: 'relative',
                }}
              >
                <img
                  src={heroModelImg}
                  alt="Modern Style Fashion Model"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Value Props Bar (Screenshot #1) */}
      <section className="container">
        <div className="value-props-bar">
          <div className="value-prop-item">
            <div className="value-prop-icon">
              <Truck size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="value-prop-title">Free Shipping</div>
              <div className="value-prop-desc">On orders over $50</div>
            </div>
          </div>

          <div className="value-prop-item">
            <div className="value-prop-icon">
              <Tag size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="value-prop-title">Special Offers</div>
              <div className="value-prop-desc">Save up to 50%</div>
            </div>
          </div>

          <div className="value-prop-item">
            <div className="value-prop-icon">
              <ShieldCheck size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="value-prop-title">Secure Payment</div>
              <div className="value-prop-desc">100% secure checkout</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Products Section (Screenshot #1) */}
      <section className="container" style={{ padding: '2rem 0 5rem 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#000000',
                letterSpacing: '-0.025em',
                marginBottom: '0.75rem',
              }}
            >
              Featured Products
            </h2>

            {/* Filter Tabs matching Screenshot #1 */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('new')}
                className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
              >
                New Arrivals
              </button>
              <button
                onClick={() => setActiveTab('bestsellers')}
                className={`tab-btn ${activeTab === 'bestsellers' ? 'active' : ''}`}
              >
                Best Sellers
              </button>
              <button
                onClick={() => setActiveTab('toprated')}
                className={`tab-btn ${activeTab === 'toprated' ? 'active' : ''}`}
              >
                Top Rated
              </button>
            </div>
          </div>

          <Link
            to="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: '#000000',
              textDecoration: 'none',
              padding: '0.5rem 0',
            }}
          >
            <span>View All</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <LoadingSpinner message="Loading curated products..." />
        ) : getDisplayedProducts().length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#71717a' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No products available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid-products">
            {getDisplayedProducts().slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Categories Banner Section */}
      {categories.length > 0 && (
        <section
          style={{
            backgroundColor: '#fafafa',
            borderTop: '1px solid #e5e7eb',
            padding: '4rem 0',
          }}
        >
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000', letterSpacing: '-0.02em' }}>
                  Explore Collections
                </h2>
                <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Browse our curated collections engineered for modern essentials.
                </p>
              </div>
              <Link to="/products" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
                All Categories →
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${encodeURIComponent(cat.slug || cat.name)}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1.5rem 1.25rem',
                    textAlign: 'center',
                    transition: 'all 150ms ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#000000';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#000000', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Explore Store</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};
export default HomePage;
