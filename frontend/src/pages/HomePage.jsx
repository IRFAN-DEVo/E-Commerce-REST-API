import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Truck,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/products/ProductCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AnimatedContent } from '../components/common/AnimatedContent';
import { FadeContent } from '../components/common/FadeContent';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import {
  HandDrawnUnderline,
  HandDrawnArrow,
  HandDrawnCircle,
  HandDrawnStar,
  EditorialBadge,
  HandwrittenNote,
} from '../components/editorial/EditorialAnnotations';

import heroWatchImg from '../assets/hero_watch.jpg';
import heroHeadphonesImg from '../assets/hero_headphones.jpg';

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('new');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      productsApi.getCategories(),
      productsApi.getProducts({ page_size: 16 }),
    ])
      .then(([cats, prods]) => {
        if (isMounted) {
          setCategories(Array.isArray(cats) ? cats : cats?.results || []);
          const prodList = Array.isArray(prods) ? prods : prods?.results || [];
          setFeaturedProducts(prodList);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load homepage catalog data', err);
          setApiError(true);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamically select the flagship hero product from real API data
  const heroProduct = useMemo(() => {
    if (!featuredProducts || featuredProducts.length === 0) return null;
    const withImages = featuredProducts.filter((p) => p && p.image);
    if (withImages.length === 0) return featuredProducts[0];

    // Prefer high-value iconic hardware statement (e.g. Laptops or Audio), or the top image product
    const highValueStatement = withImages.find(
      (p) => Number(p.price || 0) >= 50000 || p.category_name === 'Laptops' || p.category_name === 'Audio'
    );
    return highValueStatement || withImages[0];
  }, [featuredProducts]);

  // Products pool for the asymmetric showcase
  const showcaseProducts = useMemo(() => {
    if (!featuredProducts || featuredProducts.length === 0) return [];
    const withImages = featuredProducts.filter((p) => p && p.image && p.id !== heroProduct?.id);
    return withImages.length > 0 ? withImages : featuredProducts;
  }, [featuredProducts, heroProduct]);

  // Curated showcase pool (up to 6 items to rotate smoothly)
  const curatedShowcaseList = useMemo(() => {
    return showcaseProducts.slice(0, 6);
  }, [showcaseProducts]);

  const [currentShowcaseIndex, setCurrentShowcaseIndex] = useState(0);
  const [isShowcasePaused, setIsShowcasePaused] = useState(false);

  // Auto-slide every 3 seconds over time
  useEffect(() => {
    if (isShowcasePaused || curatedShowcaseList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentShowcaseIndex((prev) => (prev + 1) % curatedShowcaseList.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isShowcasePaused, curatedShowcaseList.length]);

  const handlePrevShowcase = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentShowcaseIndex((prev) => (prev - 1 + curatedShowcaseList.length) % curatedShowcaseList.length);
  };

  const handleNextShowcase = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentShowcaseIndex((prev) => (prev + 1) % curatedShowcaseList.length);
  };

  const activeShowcase = curatedShowcaseList[currentShowcaseIndex] || curatedShowcaseList[0];
  const supportingShowcase =
    curatedShowcaseList.length > 1
      ? curatedShowcaseList[(currentShowcaseIndex + 1) % curatedShowcaseList.length]
      : null;

  // Tabbed filter for the trending products grid
  const displayedProducts = useMemo(() => {
    if (!featuredProducts || featuredProducts.length === 0) return [];
    if (activeTab === 'bestsellers') {
      return [...featuredProducts].reverse().slice(0, 8);
    }
    if (activeTab === 'toprated') {
      return [...featuredProducts]
        .sort((a, b) => (b.stock || 0) - (a.stock || 0))
        .slice(0, 8);
    }
    return featuredProducts.slice(0, 8);
  }, [featuredProducts, activeTab]);

  const handleHeroAddToCart = async (product) => {
    if (!product) return;
    if (!product.is_available || product.stock <= 0) {
      showToast('This product is currently out of stock.', 'warning');
      return;
    }
    await addItem(product.id, 1);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 1. TOP EDITORIAL TICKER / RUNNING MARQUEE */}
      <div className="editorial-ticker-wrap" aria-hidden="true">
        <div className="editorial-ticker">
          <span className="ticker-item">
            <span className="ticker-dot" />
            Curated Hardware Archive
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Zero Compromise Performance
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Nationwide Express Delivery
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Verified Authenticity
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Form Meets Relentless Function
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Curated Hardware Archive
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Zero Compromise Performance
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Nationwide Express Delivery
          </span>
          <span className="ticker-item">
            <span className="ticker-dot" />
            Verified Authenticity
          </span>
        </div>
      </div>

      {/* 2. HOMEPAGE HERO — EDITORIAL COMPOSITION WITH HAND-DRAWN ANNOTATIONS */}
      <section
        style={{
          position: 'relative',
          backgroundColor: '#fafafb',
          borderBottom: '1px solid #e5e7eb',
          padding: 'clamp(2.5rem, 5vw, 5rem) 0 clamp(3rem, 6vw, 6rem)',
        }}
      >
        <div className="container" style={{ position: 'relative' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 0.85fr',
              alignItems: 'center',
              gap: 'clamp(2rem, 5vw, 4.5rem)',
            }}
            className="hero-grid"
          >
            {/* Left Column: Oversized Editorial Typography & Narrative */}
            <div>
              <AnimatedContent
                distance={40}
                direction="vertical"
                duration={0.8}
                ease="power3.out"
                initialOpacity={0}
                animateOpacity
              >
                {/* Issue Badge / Volume Marker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <EditorialBadge text="ISSUE 04 // 2026 EDITION" variant="dark" />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#71717a',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Curated Technology Archive
                  </span>
                </div>

                {/* Oversized Headline with Hand-drawn Underline */}
                <h1
                  className="editorial-headline"
                  style={{
                    fontSize: 'clamp(2.75rem, 6.2vw, 5.25rem)',
                    lineHeight: 0.95,
                    marginBottom: '1.5rem',
                    position: 'relative',
                    maxWidth: '650px',
                  }}
                >
                  TECH THAT
                  <br />
                  MAKES A
                  <br />
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    STATEMENT.
                    <HandDrawnUnderline
                      color="#d4ff00"
                      height={18}
                      style={{
                        position: 'absolute',
                        left: 0,
                        bottom: '-6px',
                        width: '100%',
                      }}
                    />
                  </span>
                </h1>

                {/* Subtitle / Philosophy */}
                <p
                  className="editorial-subhead"
                  style={{
                    fontSize: 'clamp(1rem, 1.4vw, 1.1875rem)',
                    maxWidth: '520px',
                    marginBottom: '2rem',
                    color: '#4b5563',
                  }}
                >
                  Uncompromising hardware engineered for architects of the modern workspace.
                  Discover authentic devices crafted for enduring performance.
                </p>

                {/* CTAs */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    marginBottom: '2.5rem',
                  }}
                >
                  <Link
                    to="/products"
                    className="btn"
                    style={{
                      backgroundColor: '#0a0a0a',
                      color: '#ffffff',
                      padding: '0.9rem 2.25rem',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      transition: 'all 200ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#222222';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0a0a0a';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>SHOP THE EDIT</span>
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </Link>

                  <Link
                    to="/products"
                    style={{
                      color: '#0a0a0a',
                      padding: '0.85rem 1.75rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      borderRadius: '9999px',
                      border: '1px solid #d4d4d8',
                      backgroundColor: '#ffffff',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0a0a0a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d4d4d8';
                    }}
                  >
                    <span>EXPLORE CATALOG</span>
                    <ArrowUpRight size={16} />
                  </Link>
                </div>

                {/* Hand-drawn editorial annotation pointing to the showcase */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <HandDrawnArrow
                    direction="down-right"
                    width={48}
                    height={36}
                    color="#0a0a0a"
                    accent="#d4ff00"
                  />
                  <HandwrittenNote rotate={-2} color="#18181b">
                    Flagship specs. Handpicked hardware.
                  </HandwrittenNote>
                </div>
              </AnimatedContent>
            </div>

            {/* Right Column: Hero Real Product Showcase with Hand-Drawn Feature Callouts */}
            <div style={{ position: 'relative' }}>
              <AnimatedContent
                distance={50}
                direction="horizontal"
                duration={0.9}
                ease="power3.out"
                initialOpacity={0}
                animateOpacity
                delay={0.15}
              >
                {/* Floating Handwritten Stamp / Tag top-right */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-1.5rem',
                    right: '1rem',
                    zIndex: 10,
                  }}
                  className="hero-stamp"
                >
                  <HandwrittenNote rotate={4} color="#000000" accentColor="#d4ff00">
                    <HandDrawnCircle color="#d4ff00" strokeWidth={2.5}>
                      <span style={{ fontWeight: 800, fontSize: '0.875rem', letterSpacing: '0.04em' }}>
                        100% AUTHENTIC
                      </span>
                    </HandDrawnCircle>
                  </HandwrittenNote>
                </div>

                {/* Product Frame */}
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '2rem 1.5rem 1.75rem',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Subtle Background Accent Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
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
                      SPOTLIGHT
                    </span>
                    {heroProduct?.category_name && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#71717a',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {heroProduct.category_name}
                      </span>
                    )}
                  </div>

                  {/* Real Product Image Container */}
                  <Link
                    to={heroProduct ? `/products/${heroProduct.id}` : '/products'}
                    style={{
                      display: 'block',
                      height: 'clamp(280px, 36vw, 380px)',
                      margin: '1.5rem 0 1rem',
                      position: 'relative',
                      textAlign: 'center',
                    }}
                    aria-label={heroProduct ? `View ${heroProduct.name}` : 'View products'}
                  >
                    <img
                      src={heroProduct?.image || heroWatchImg}
                      alt={heroProduct?.name || 'Featured Statement Hardware'}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = heroWatchImg;
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </Link>

                  {/* Editorial Floating Spec Callout */}
                  <div
                    style={{
                      backgroundColor: '#f8f8fa',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '0.85rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={heroProduct ? `/products/${heroProduct.id}` : '/products'}
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: '#0a0a0a',
                          display: 'block',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {heroProduct?.name || 'Curated Editorial Hardware'}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0a0a0a' }}>
                          ₹{Number(heroProduct?.price || 2499).toFixed(2)}
                        </span>
                        {heroProduct?.brand_name && (
                          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                            by {heroProduct.brand_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => heroProduct && handleHeroAddToCart(heroProduct)}
                      style={{
                        backgroundColor: '#0a0a0a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'background-color 150ms ease',
                      }}
                      aria-label="Add featured product to cart"
                    >
                      <ShoppingCart size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </AnimatedContent>
            </div>
          </div>
        </div>
      </section>

      {/* 3. EDITORIAL PRODUCT SHOWCASE — ASYMMETRIC CURATED COLLECTION */}
      <section style={{ padding: 'clamp(3rem, 6vw, 6rem) 0', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <AnimatedContent
            distance={40}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
          >
            {/* Section Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: '2.5rem',
                flexWrap: 'wrap',
                gap: '1.25rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <HandDrawnStar color="#d4ff00" size={16} />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#71717a',
                    }}
                  >
                    CURATED SPECIMENS
                  </span>
                </div>
                <h2
                  className="editorial-headline"
                  style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', margin: 0 }}
                >
                  FEATURED EDIT
                </h2>
              </div>

              <Link
                to="/products"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#0a0a0a',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  borderBottom: '2px solid #0a0a0a',
                  paddingBottom: '2px',
                }}
              >
                <span>VIEW FULL ARCHIVE</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Asymmetric Showcase Grid: 1 Large Editorial Card + Stack of 2 with Manifesto */}
            <div className="editorial-showcase-grid">
              {/* Primary Large Card with Auto-Slide & FadeContent Mist Animation */}
              {activeShowcase ? (
                <div
                  className="editorial-card"
                  onMouseEnter={() => setIsShowcasePaused(true)}
                  onMouseLeave={() => setIsShowcasePaused(false)}
                  style={{
                    padding: '2rem',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top Bar: Category on Left, Dots and Index Pill on Right */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      position: 'relative',
                      zIndex: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: '#71717a',
                      }}
                    >
                      {activeShowcase.category_name || 'HARDWARE'}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Slide dots */}
                      {curatedShowcaseList.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {curatedShowcaseList.map((_, dotIdx) => (
                            <button
                              key={dotIdx}
                              type="button"
                              onClick={() => setCurrentShowcaseIndex(dotIdx)}
                              style={{
                                width: dotIdx === currentShowcaseIndex ? '18px' : '6px',
                                height: '5px',
                                borderRadius: '9999px',
                                backgroundColor: dotIdx === currentShowcaseIndex ? '#0a0a0a' : '#d4d4d8',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                transition: 'all 200ms ease',
                              }}
                              aria-label={`Go to slide ${dotIdx + 1}`}
                            />
                          ))}
                        </div>
                      )}

                      <span
                        style={{
                          backgroundColor: '#0a0a0a',
                          color: '#d4ff00',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        N° 0{currentShowcaseIndex + 1} SELECT
                      </span>
                    </div>
                  </div>

                  {/* Fading Content Wrapper driven by activeShowcase.id */}
                  <FadeContent
                    key={activeShowcase.id}
                    trigger="mount"
                    effect="mist"
                    duration={0.85}
                    ease="power2.out"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      flex: 1,
                      width: '100%',
                    }}
                  >
                    <div>
                      <Link
                        to={`/products/${activeShowcase.id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <h3
                          style={{
                            fontSize: 'clamp(1.25rem, 2vw, 1.625rem)',
                            fontWeight: 800,
                            color: '#0a0a0a',
                            lineHeight: 1.2,
                            letterSpacing: '-0.02em',
                            marginBottom: '0.5rem',
                          }}
                        >
                          {activeShowcase.name}
                        </h3>
                      </Link>

                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0a0a0a', marginBottom: '1.5rem' }}>
                        ₹{Number(activeShowcase.price).toFixed(2)}
                      </div>
                    </div>

                    {/* Product Photography Container */}
                    <div style={{ position: 'relative', margin: '1rem 0 2rem' }}>
                      <Link
                        to={`/products/${activeShowcase.id}`}
                        style={{
                          display: 'block',
                          height: 'clamp(220px, 28vw, 320px)',
                          textAlign: 'center',
                        }}
                      >
                        <img
                          src={activeShowcase.image}
                          alt={activeShowcase.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transition: 'transform 300ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.04)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        />
                      </Link>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#71717a' }}>
                        {activeShowcase.brand_name ? `Crafted by ${activeShowcase.brand_name}` : 'Verified Stock'}
                      </span>
                      <button
                        onClick={() => handleHeroAddToCart(activeShowcase)}
                        style={{
                          backgroundColor: '#0a0a0a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '9999px',
                          padding: '0.65rem 1.25rem',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          transition: 'background-color 150ms ease',
                        }}
                      >
                        <ShoppingCart size={15} />
                        <span>Add to Bag</span>
                      </button>
                    </div>
                  </FadeContent>

                  {/* Left/Right manual slide controls anchored with high z-index for instant clicking */}
                  {curatedShowcaseList.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevShowcase}
                        style={{
                          position: 'absolute',
                          left: '0.75rem',
                          top: '55%',
                          transform: 'translateY(-50%)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          color: '#0a0a0a',
                          zIndex: 10,
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0a0a0a';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                          e.currentTarget.style.color = '#0a0a0a';
                        }}
                        aria-label="Previous product"
                      >
                        <ChevronLeft size={20} strokeWidth={2.4} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextShowcase}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '55%',
                          transform: 'translateY(-50%)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          color: '#0a0a0a',
                          zIndex: 10,
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0a0a0a';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                          e.currentTarget.style.color = '#0a0a0a';
                        }}
                        aria-label="Next product"
                      >
                        <ChevronRight size={20} strokeWidth={2.4} />
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              {/* Secondary Stack: Manifesto block + Supporting Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Editorial Manifesto Card */}
                <div
                  style={{
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff',
                    borderRadius: '12px',
                    padding: 'clamp(1.75rem, 3vw, 2.5rem)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#d4ff00',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#d4ff00',
                      }}
                    >
                      DJANGO MART ARCHIVE MANIFESTO
                    </span>
                  </div>

                  <blockquote
                    style={{
                      fontSize: 'clamp(1.125rem, 1.8vw, 1.35rem)',
                      fontWeight: 600,
                      lineHeight: 1.4,
                      letterSpacing: '-0.02em',
                      margin: '0 0 1.25rem 0',
                      color: '#f4f4f5',
                    }}
                  >
                    “Form follows obsession. We eliminate consumer noise to curate hardware built for power,
                    longevity, and clean desktop architecture.”
                  </blockquote>

                  <div style={{ fontSize: '0.8125rem', color: '#a1a1aa', fontWeight: 500 }}>
                    — Studio Curators, Volume 2026
                  </div>
                </div>

                {/* Supporting Card with FadeContent */}
                {supportingShowcase && (
                  <div
                    className="editorial-card"
                    onMouseEnter={() => setIsShowcasePaused(true)}
                    onMouseLeave={() => setIsShowcasePaused(false)}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '1.5rem',
                      flex: 1,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <FadeContent
                      key={supportingShowcase.id}
                      trigger="mount"
                      effect="mist"
                      duration={0.85}
                      ease="power2.out"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '1.5rem',
                        width: '100%',
                      }}
                    >
                      <div style={{ width: '130px', height: '130px', flexShrink: 0 }}>
                        <Link to={`/products/${supportingShowcase.id}`}>
                          <img
                            src={supportingShowcase.image}
                            alt={supportingShowcase.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              transition: 'transform 250ms ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          />
                        </Link>
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: '#71717a',
                          }}
                        >
                          {supportingShowcase.category_name || 'CURATED'}
                        </span>
                        <Link
                          to={`/products/${supportingShowcase.id}`}
                          style={{
                            display: 'block',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#0a0a0a',
                            textDecoration: 'none',
                            marginTop: '0.25rem',
                            lineHeight: 1.3,
                          }}
                        >
                          {supportingShowcase.name}
                        </Link>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0a0a0a', margin: '0.5rem 0' }}>
                          ₹{Number(supportingShowcase.price).toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleHeroAddToCart(supportingShowcase)}
                          style={{
                            backgroundColor: '#f4f4f5',
                            color: '#0a0a0a',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0a0a0a';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                            e.currentTarget.style.color = '#0a0a0a';
                          }}
                        >
                          + Add to Bag
                        </button>
                      </div>
                    </FadeContent>
                  </div>
                )}
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 4. CATEGORY SHOWCASE — EDITORIAL ART DIRECTION */}
      {categories.length > 0 && (
        <section
          style={{
            backgroundColor: '#fafafb',
            borderBottom: '1px solid #e5e7eb',
            padding: 'clamp(3rem, 5vw, 5rem) 0',
          }}
        >
          <div className="container">
            <AnimatedContent
              distance={40}
              direction="vertical"
              duration={0.8}
              ease="power3.out"
              initialOpacity={0}
              animateOpacity
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: '2.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#71717a', marginBottom: '0.4rem' }}>
                    CATALOG INDEX
                  </div>
                  <h2 className="editorial-headline" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', margin: 0 }}>
                    CATEGORIES
                  </h2>
                </div>
                <Link
                  to="/products"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#0a0a0a',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  All Categories ({categories.length}) →
                </Link>
              </div>

              {/* Distinctive Editorial Category Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {categories.slice(0, 8).map((cat, idx) => {
                  const indexFormatted = String(idx + 1).padStart(2, '0');
                  return (
                    <Link
                      key={cat.id}
                      to={`/products?category=${encodeURIComponent(cat.slug || cat.name)}`}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '1.5rem',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 200ms ease',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '120px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0a0a0a';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#71717a',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          // {indexFormatted}
                        </span>
                        <ArrowUpRight size={16} color="#71717a" />
                      </div>

                      <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#0a0a0a', letterSpacing: '-0.01em' }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.2rem' }}>
                          Explore Collection
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </AnimatedContent>
          </div>
        </section>
      )}

      {/* 5. TRENDING PRODUCTS — HIGH CONTRAST EDITORIAL GRID */}
      <section className="container" style={{ padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
        <AnimatedContent
          distance={40}
          direction="vertical"
          duration={0.8}
          ease="power3.out"
          initialOpacity={0}
          animateOpacity
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2.5rem',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#71717a', marginBottom: '0.4rem' }}>
                LIVE INVENTORY
              </div>
              <h2
                className="editorial-headline"
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  margin: '0 0 1rem 0',
                }}
              >
                Featured Products
              </h2>

              {/* Tab Filters */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveTab('new')}
                  className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    letterSpacing: '0.02em',
                  }}
                >
                  New Arrivals
                </button>
                <button
                  onClick={() => setActiveTab('bestsellers')}
                  className={`tab-btn ${activeTab === 'bestsellers' ? 'active' : ''}`}
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Best Sellers
                </button>
                <button
                  onClick={() => setActiveTab('toprated')}
                  className={`tab-btn ${activeTab === 'toprated' ? 'active' : ''}`}
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    letterSpacing: '0.02em',
                  }}
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
                fontWeight: 700,
                fontSize: '0.9375rem',
                color: '#0a0a0a',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '2px solid #0a0a0a',
                paddingBottom: '2px',
              }}
            >
              <span>View All</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Product Cards Grid */}
          {isLoading ? (
            <LoadingSpinner message="Curating catalog..." />
          ) : displayedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: '#71717a' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No products available yet.</p>
              <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="grid-products">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </AnimatedContent>
      </section>

      {/* 6. EDITORIAL BRAND STATEMENT / VISUAL BREAK */}
      <section
        style={{
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          padding: 'clamp(4rem, 8vw, 7rem) 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: '840px', position: 'relative' }}>
          <EditorialBadge text="THE DJANGOMART PHILOSOPHY" variant="lime" style={{ marginBottom: '2rem' }} />

          <h2
            className="editorial-headline"
            style={{
              color: '#ffffff',
              fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
              lineHeight: 1.05,
              marginBottom: '1.5rem',
            }}
          >
            PRECISION ENGINEERING FOR THE UNCOMPROMISING.
          </h2>

          <p
            style={{
              fontSize: 'clamp(1rem, 1.3vw, 1.1875rem)',
              color: '#a1a1aa',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              fontWeight: 400,
            }}
          >
            Every piece in our catalog is benchmarked against strict standards of industrial design,
            thermal efficiency, tactile feedback, and endurance. We don't just sell electronics—we
            curate the tools of modern thought.
          </p>

          <Link
            to="/products"
            className="btn"
            style={{
              backgroundColor: '#d4ff00',
              color: '#0a0a0a',
              fontWeight: 800,
              fontSize: '0.9375rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              borderRadius: '9999px',
              padding: '0.85rem 2.25rem',
            }}
          >
            EXPLORE THE FULL COLLECTION
          </Link>
        </div>
      </section>

      {/* 7. VALUE PROPOSITIONS STRIP */}
      <section className="container">
        <div className="value-props-bar" style={{ margin: '3rem auto 5rem', border: '1px solid #e5e7eb' }}>
          <div className="value-prop-item">
            <div className="value-prop-icon">
              <Truck size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="value-prop-title">Complimentary Courier</div>
              <div className="value-prop-desc">Express delivery on orders over ₹999</div>
            </div>
          </div>

          <div className="value-prop-item">
            <div className="value-prop-icon">
              <Zap size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="value-prop-title">Verified Hardware</div>
              <div className="value-prop-desc">100% genuine factory warranty</div>
            </div>
          </div>

          <div className="value-prop-item">
            <div className="value-prop-icon">
              <ShieldCheck size={20} strokeWidth={2} />
            </div>
            <div>
              <div className="value-prop-title">Secure Checkout</div>
              <div className="value-prop-desc">Razorpay 256-bit & COD supported</div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive adjustments */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .hero-stamp {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
