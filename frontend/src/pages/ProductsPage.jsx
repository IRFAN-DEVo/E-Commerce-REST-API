import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, RotateCcw, SlidersHorizontal, Star, X, Check } from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/products/ProductCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedContent } from '../components/common/AnimatedContent';

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter States initialized from URL params
  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const searchParam = searchParams.get('search') || '';
  const orderingParam = searchParams.get('ordering') || '-created_at';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';

  const pageSize = 12;

  // Lock scroll when mobile filter drawer is open
  useEffect(() => {
    if (isMobileFilterOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [isMobileFilterOpen]);

  // Close mobile filter on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileFilterOpen) {
        setIsMobileFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileFilterOpen]);

  // Load Categories & Brands filter metadata once
  useEffect(() => {
    productsApi.getCategories().then((data) => {
      setCategories(Array.isArray(data) ? data : data?.results || []);
    });
    productsApi.getBrands().then((data) => {
      setBrands(Array.isArray(data) ? data : data?.results || []);
    });
  }, []);

  // Fetch Products based on current params
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pageParam,
        page_size: pageSize,
      };
      if (categoryParam && categoryParam !== 'all') params.category = categoryParam;
      if (brandParam && brandParam !== 'all') params.brand = brandParam;
      if (searchParam) params.search = searchParam;
      if (orderingParam) params.ordering = orderingParam;
      if (minPriceParam) params.min_price = minPriceParam;
      if (maxPriceParam) params.max_price = maxPriceParam;

      const data = await productsApi.getProducts(params);
      if (Array.isArray(data)) {
        setProducts(data);
        setTotalCount(data.length);
      } else {
        setProducts(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch {
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [categoryParam, brandParam, searchParam, orderingParam, pageParam, minPriceParam, maxPriceParam]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Reset to page 1 on filter changes
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const activeFiltersCount =
    (categoryParam ? 1 : 0) +
    (brandParam ? 1 : 0) +
    (minPriceParam || maxPriceParam ? 1 : 0) +
    (searchParam ? 1 : 0);

  // Render Filter Form Content
  const renderFilterControls = (isMobile = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Reset Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.875rem',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#000000', letterSpacing: '-0.02em' }}>
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </span>
        <button
          onClick={handleResetFilters}
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#71717a',
            transition: 'color 150ms',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.target.style.color = '#000')}
          onMouseLeave={(e) => (e.target.style.color = '#71717a')}
        >
          Clear All
        </button>
      </div>

      {/* Category Filter */}
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.75rem' }}>
          Category
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: isMobile ? '200px' : 'none',
            overflowY: isMobile ? 'auto' : 'visible',
            paddingRight: isMobile ? '0.5rem' : '0',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: !categoryParam ? '#000000' : '#52525b',
              cursor: 'pointer',
              fontWeight: !categoryParam ? 600 : 400,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={!categoryParam}
                onChange={() => updateParam('category', '')}
                className="form-checkbox"
              />
              <span>All Categories</span>
            </span>
          </label>

          {categories.map((c) => {
            const isChecked =
              categoryParam === String(c.id) ||
              (c.name && categoryParam.toLowerCase() === c.name.toLowerCase()) ||
              (c.slug && categoryParam.toLowerCase() === c.slug.toLowerCase());
            return (
              <label
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: isChecked ? '#000000' : '#52525b',
                  cursor: 'pointer',
                  fontWeight: isChecked ? 600 : 400,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(isChecked)}
                    onChange={() => updateParam('category', isChecked ? '' : c.name || c.id)}
                    className="form-checkbox"
                  />
                  <span>{c.name}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Brand Filter */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.75rem' }}>
          Brand
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: isMobile ? '200px' : 'none',
            overflowY: isMobile ? 'auto' : 'visible',
            paddingRight: isMobile ? '0.5rem' : '0',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: !brandParam ? '#000000' : '#52525b',
              cursor: 'pointer',
              fontWeight: !brandParam ? 600 : 400,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={!brandParam}
                onChange={() => updateParam('brand', '')}
                className="form-checkbox"
              />
              <span>All Brands</span>
            </span>
          </label>

          {brands.map((b) => {
            const isChecked =
              brandParam === String(b.id) ||
              (b.name && brandParam.toLowerCase() === b.name.toLowerCase()) ||
              (b.slug && brandParam.toLowerCase() === b.slug.toLowerCase());
            return (
              <label
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: isChecked ? '#000000' : '#52525b',
                  cursor: 'pointer',
                  fontWeight: isChecked ? 600 : 400,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(isChecked)}
                    onChange={() => updateParam('brand', isChecked ? '' : b.name || b.id)}
                    className="form-checkbox"
                  />
                  <span>{b.name}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.75rem' }}>
          Price Range (₹)
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="number"
            placeholder="Min"
            className="form-input"
            value={minPriceParam}
            onChange={(e) => updateParam('min_price', e.target.value)}
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.625rem' }}
          />
          <span style={{ color: '#a1a1aa' }}>-</span>
          <input
            type="number"
            placeholder="Max"
            className="form-input"
            value={maxPriceParam}
            onChange={(e) => updateParam('max_price', e.target.value)}
            style={{ fontSize: '0.8125rem', padding: '0.45rem 0.625rem' }}
          />
        </div>
      </div>

      {/* Rating Filter */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.25rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.75rem' }}>
          Rating
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" className="form-checkbox" defaultChecked />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ display: 'flex', color: '#000000' }}>
                <Star size={14} fill="#000000" />
                <Star size={14} fill="#000000" />
                <Star size={14} fill="#000000" />
                <Star size={14} fill="#000000" />
                <Star size={14} fill="none" />
              </div>
              <span>4.0 & above</span>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" className="form-checkbox" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ display: 'flex', color: '#000000' }}>
                <Star size={14} fill="#000000" />
                <Star size={14} fill="#000000" />
                <Star size={14} fill="#000000" />
                <Star size={14} fill="none" />
                <Star size={14} fill="none" />
              </div>
              <span>3.0 & above</span>
            </div>
          </label>
        </div>
      </div>

      {isMobile && (
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(false)}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: '0.5rem', borderRadius: '8px' }}
        >
          View Results ({totalCount})
        </button>
      )}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: 'clamp(1.5rem, 3vw, 2rem) 0 5rem 0' }}>
      <div className="container">
        {/* Mobile Filter Button & Quick Toolbar */}
        <div className="catalog-mobile-toolbar">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: activeFiltersCount > 0 ? '#000000' : '#ffffff',
              color: activeFiltersCount > 0 ? '#ffffff' : '#000000',
              borderColor: activeFiltersCount > 0 ? '#000000' : '#e5e7eb',
            }}
            aria-label="Open filter options"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span
                style={{
                  backgroundColor: '#d4ff00',
                  color: '#000000',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.45rem',
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Quick Active Filter Summary */}
          <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
            {totalCount} {totalCount === 1 ? 'Product' : 'Products'}
          </div>
        </div>

        {/* Layout: Desktop Sidebar + Catalog Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '2.5rem',
            alignItems: 'start',
          }}
          className="catalog-layout"
        >
          {/* Left Sidebar Filters (Desktop Only) */}
          <AnimatedContent
            distance={40}
            direction="horizontal"
            reverse={true}
            duration={0.8}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
            scale={0.98}
            delay={0.1}
            className="desktop-filter-panel"
          >
            <aside
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                backgroundColor: '#ffffff',
                paddingRight: '1rem',
              }}
              className="catalog-filters"
            >
              {renderFilterControls(false)}
            </aside>
          </AnimatedContent>

          {/* Catalog Main Content */}
          <AnimatedContent
            distance={50}
            direction="vertical"
            duration={0.8}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
            scale={0.99}
            delay={0.15}
            style={{ width: '100%', minWidth: 0 }}
          >
            <div>
              {/* Top Bar: Search Input + Sorting */}
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* Search Bar in View */}
                <div style={{ position: 'relative', flex: 1, minWidth: 'min(100%, 260px)' }}>
                  <input
                    type="text"
                    placeholder="Search products in view..."
                    className="form-input"
                    value={searchParam}
                    onChange={(e) => updateParam('search', e.target.value)}
                    style={{
                      paddingLeft: '2.5rem',
                      paddingRight: '1rem',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                      borderColor: '#e5e7eb',
                      fontSize: '0.875rem',
                    }}
                    aria-label="Search within products catalog"
                  />
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.9rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#71717a',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {/* Sort by dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.875rem', color: '#71717a', whiteSpace: 'nowrap' }}>
                    Sort by:
                  </span>
                  <select
                    className="form-select"
                    style={{
                      width: 'auto',
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      borderColor: '#e5e7eb',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                    value={orderingParam}
                    onChange={(e) => updateParam('ordering', e.target.value)}
                    aria-label="Sort products by"
                  >
                    <option value="-created_at">Popularity</option>
                    <option value="price">Price: Low to High</option>
                    <option value="-price">Price: High to Low</option>
                    <option value="-stock">Highest Stock</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Chips Bar */}
              {activeFiltersCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginBottom: '1.5rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #f4f4f5',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>
                    Active Filters:
                  </span>
                  {categoryParam && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: '#f4f4f5',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#000000',
                      }}
                    >
                      <span>Category: {categoryParam}</span>
                      <button
                        onClick={() => updateParam('category', '')}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                        aria-label="Clear category filter"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )}
                  {brandParam && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: '#f4f4f5',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#000000',
                      }}
                    >
                      <span>Brand: {brandParam}</span>
                      <button
                        onClick={() => updateParam('brand', '')}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                        aria-label="Clear brand filter"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )}
                  {(minPriceParam || maxPriceParam) && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: '#f4f4f5',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#000000',
                      }}
                    >
                      <span>
                        Price: ₹{minPriceParam || 0} - ₹{maxPriceParam || '∞'}
                      </span>
                      <button
                        onClick={() => {
                          updateParam('min_price', '');
                          updateParam('max_price', '');
                        }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                        aria-label="Clear price filter"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={handleResetFilters}
                    style={{
                      fontSize: '0.75rem',
                      color: '#dc2626',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Product Grid */}
              {isLoading ? (
                <LoadingSpinner message="Fetching products..." />
              ) : products.length > 0 ? (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 'clamp(1rem, 2.5vw, 1.5rem)',
                    }}
                    className="catalog-products-grid"
                  >
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  <Pagination
                    currentPage={pageParam}
                    totalPages={totalPages}
                    onPageChange={(p) => updateParam('page', p.toString())}
                  />
                </>
              ) : (
                <EmptyState
                  title="No products matched your criteria"
                  description="Try adjusting your filters, clearing your search query, or checking back later."
                  actionText="Reset Filters"
                  onAction={handleResetFilters}
                />
              )}
            </div>
          </AnimatedContent>
        </div>
      </div>

      {/* Mobile Filter Slide-Over Drawer */}
      {isMobileFilterOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMobileFilterOpen(false);
            }
          }}
          style={{ zIndex: 1100 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(90vw, 360px)',
              backgroundColor: '#ffffff',
              padding: '1.5rem',
              overflowY: 'auto',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1150,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '1rem',
              }}
            >
              <h3 id="mobile-filter-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                Filter Products
              </h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="touch-target"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#71717a',
                  padding: '4px',
                }}
                aria-label="Close filters drawer"
              >
                <X size={20} />
              </button>
            </div>

            {renderFilterControls(true)}
          </div>
        </div>
      )}

      <style>{`
        .catalog-mobile-toolbar {
          display: none;
        }
        @media (max-width: 900px) {
          .catalog-layout {
            grid-template-columns: 1fr !important;
          }
          .desktop-filter-panel {
            display: none !important;
          }
          .catalog-mobile-toolbar {
            display: flex !important;
            align-items: center;
            justifyContent: space-between;
            margin-bottom: 1.25rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
          }
          .catalog-products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 340px) {
          .catalog-products-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductsPage;
