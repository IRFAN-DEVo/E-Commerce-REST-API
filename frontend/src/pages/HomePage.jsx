import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Tag, ShieldCheck, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/products/ProductCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AnimatedContent } from '../components/common/AnimatedContent';

import heroWatchImg from '../assets/hero_watch.jpg';
import heroShoesImg from '../assets/hero_shoes.jpg';
import heroHeadphonesImg from '../assets/hero_headphones.jpg';
import heroModelImg from '../assets/hero_model.jpg';
import heroBackpackImg from '../assets/auth_hero.jpg';

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('new');
  const [isLoading, setIsLoading] = useState(true);

  // Default fallback slides if backend has no products or while loading
  const defaultSlides = useMemo(
    () => [
      { id: 1, image: heroWatchImg, alt: 'Minimalist Luxury Watch', title: 'Minimalist Luxury Watch', price: '2499.00' },
      { id: 2, image: heroShoesImg, alt: 'Performance Running Shoes', title: 'Performance Running Shoes', price: '3499.00' },
      { id: 3, image: heroHeadphonesImg, alt: 'Wireless Noise Canceling Headphones', title: 'Wireless Noise Canceling Headphones', price: '4999.00' },
      { id: 4, image: heroModelImg, alt: 'Everyday Modern Apparel', title: 'Everyday Modern Apparel', price: '1999.00' },
      { id: 5, image: heroBackpackImg, alt: 'Urban Streetwear & Leather Backpack', title: 'Urban Streetwear & Leather Backpack', price: '2999.00' },
    ],
    []
  );

  // Derive 5 hero slides dynamically from database products with images
  const heroSlides = useMemo(() => {
    const productsWithImages = (featuredProducts || []).filter((p) => p && p.image);
    if (productsWithImages.length === 0) {
      if (featuredProducts.length > 0) {
        return defaultSlides.map((slide, i) => ({
          ...slide,
          id: featuredProducts[i % featuredProducts.length]?.id || slide.id,
        }));
      }
      return defaultSlides;
    }

    const dbSlides = productsWithImages.slice(0, 5).map((p) => ({
      id: p.id,
      image: p.image,
      alt: p.name,
      title: p.name,
      price: p.discount_price && Number(p.discount_price) < Number(p.price) ? p.discount_price : p.price,
    }));

    if (dbSlides.length < 5) {
      const remaining = defaultSlides.slice(dbSlides.length).map((slide, i) => ({
        ...slide,
        id: featuredProducts[i % featuredProducts.length]?.id || slide.id,
      }));
      return [...dbSlides, ...remaining];
    }
    return dbSlides;
  }, [featuredProducts, defaultSlides]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (isPaused || heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, heroSlides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      productsApi.getCategories(),
      productsApi.getProducts({ page_size: 12 }),
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
            <AnimatedContent
              distance={70}
              direction="vertical"
              duration={0.9}
              ease="power3.out"
              initialOpacity={0}
              animateOpacity
              scale={0.98}
              delay={0.1}
            >
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
            </AnimatedContent>

            {/* Right Column: Hero Slider Carousel */}
            <AnimatedContent
              distance={70}
              direction="horizontal"
              reverse={false}
              duration={1}
              ease="power3.out"
              initialOpacity={0}
              animateOpacity
              scale={0.97}
              delay={0.2}
            >
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
              {/* Slider Image Box */}
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
                {heroSlides.map((slide, index) => {
                  const isActive = index === currentSlide;
                  return (
                    <div
                      key={slide.id || index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'scale(1)' : 'scale(1.02)',
                        transition: 'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                        pointerEvents: isActive ? 'auto' : 'none',
                      }}
                    >
                      <Link
                        to={`/products/${slide.id}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          position: 'relative',
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                        aria-label={`View product ${slide.title || slide.alt}`}
                      >
                        <img
                          src={slide.image}
                          alt={slide.alt || slide.title || 'Product'}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = heroWatchImg;
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                          }}
                        />

                        {/* Floating Product Card Badge on Hero Slide */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '1rem',
                            left: '1rem',
                            right: '1rem',
                            maxWidth: 'calc(100% - 2rem)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            borderRadius: '10px',
                            padding: '0.625rem 1rem',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            border: '1px solid rgba(229, 231, 235, 0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color: '#09090b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {slide.title}
                            </div>
                            {slide.price && (
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#18181b', marginTop: '2px' }}>
                                ₹{Number(slide.price).toFixed(2)}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#000000',
                              backgroundColor: '#f4f4f5',
                              padding: '0.375rem 0.625rem',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              flexShrink: 0,
                            }}
                          >
                            <span>View Product</span>
                            <ArrowRight size={13} strokeWidth={2.5} />
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}

                {/* Left/Right Desktop Navigation Arrows */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePrevSlide();
                  }}
                  className="slider-nav-btn"
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    border: '1px solid rgba(229, 231, 235, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000000',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    transition: 'all 150ms ease',
                    zIndex: 10,
                  }}
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={18} strokeWidth={2.2} />
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNextSlide();
                  }}
                  className="slider-nav-btn"
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    border: '1px solid rgba(229, 231, 235, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000000',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    transition: 'all 150ms ease',
                    zIndex: 10,
                  }}
                  aria-label="Next slide"
                >
                  <ChevronRight size={18} strokeWidth={2.2} />
                </button>
              </div>

              {/* 5 Small Indicator Dots below image matching prompt mockup */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  marginTop: '1.25rem',
                }}
              >
                {heroSlides.map((_, dotIndex) => {
                  const isActive = dotIndex === currentSlide;
                  return (
                    <button
                      key={dotIndex}
                      onClick={() => setCurrentSlide(dotIndex)}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? '#000000' : '#e4e4e7',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 200ms ease',
                        outline: 'none',
                      }}
                      aria-label={`Go to slide ${dotIndex + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </AnimatedContent>
        </div>
        </div>
      </section>

      {/* 2. Value Props Bar (Screenshot #1) */}
      <section className="container">
        <AnimatedContent
          distance={40}
          direction="vertical"
          duration={0.8}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
          threshold={0.1}
        >
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
        </AnimatedContent>
      </section>

      {/* 3. Featured Products Section (Screenshot #1) */}
      <section className="container" style={{ padding: '2rem 0 5rem 0' }}>
        <AnimatedContent
          distance={50}
          direction="vertical"
          duration={0.8}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
          threshold={0.1}
        >
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
        </AnimatedContent>
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
            <AnimatedContent
              distance={50}
              direction="vertical"
              duration={0.8}
              ease="power3.out"
              initialOpacity={0}
              animateOpacity
              threshold={0.1}
            >
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
            </AnimatedContent>
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
        @media (max-width: 768px) {
          .slider-nav-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
export default HomePage;
