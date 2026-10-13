import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Tag, ShieldCheck } from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/products/ProductCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
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

  return (
    <div>
      {/* Hero Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
          color: '#ffffff',
          padding: '4.5rem 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              padding: '0.375rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <Sparkles size={16} />
            <span>Discover Top Trending Items at DjangoMart</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: '800px',
              letterSpacing: '-0.025em',
            }}
          >
            Next-Generation E-Commerce Storefront
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'var(--primary-100)',
              maxWidth: '620px',
              lineHeight: 1.6,
            }}
          >
            Experience lightning-fast browsing, verified coupon discounts, and secure Cash on Delivery checkout powered by Django REST Framework.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/products" className="btn btn-secondary btn-lg" style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
              <span>Shop All Products</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      {categories.length > 0 && (
        <section style={{ padding: '3.5rem 0 2rem' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Featured Categories</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Explore top curated collections
                </p>
              </div>
              <Link to="/products" style={{ color: 'var(--primary-600)', fontWeight: 600, fontSize: '0.875rem' }}>
                View all &rarr;
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '1rem',
              }}
            >
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  className="card card-interactive"
                  style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-50)',
                      color: 'var(--primary-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Tag size={22} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{category.name}</div>
                  {category.product_count !== undefined && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {category.product_count} products
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section style={{ padding: '2rem 0 4rem' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Trending Products</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Handpicked selections with real-time stock availability
              </p>
            </div>
            <Link to="/products" style={{ color: 'var(--primary-600)', fontWeight: 600, fontSize: '0.875rem' }}>
              Explore catalog &rarr;
            </Link>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Loading products..." />
          ) : featuredProducts.length > 0 ? (
            <div className="grid-products">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No products found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
