import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, RotateCcw, SlidersHorizontal, Star } from 'lucide-react';
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

  // Filter States initialized from URL params
  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const searchParam = searchParams.get('search') || '';
  const orderingParam = searchParams.get('ordering') || '-created_at';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';

  const pageSize = 12;

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
    } catch (err) {
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

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', padding: '2rem 0 5rem 0' }}>
      <div className="container">
        {/* Layout: Sidebar + Catalog Grid (Matching Screenshot #2) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '2.5rem',
            alignItems: 'start',
          }}
          className="catalog-layout"
        >
          {/* Left Sidebar Filters (Screenshot #2) */}
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
            {/* Header & Reset Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#000000', letterSpacing: '-0.02em' }}>
                Filters
              </span>
              <button
                onClick={handleResetFilters}
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#71717a',
                  transition: 'color 150ms',
                }}
                onMouseEnter={(e) => e.target.style.color = '#000'}
                onMouseLeave={(e) => e.target.style.color = '#71717a'}
              >
                Clear All
              </button>
            </div>

            {/* Category Filter */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.875rem' }}>
                Category
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                  const isChecked = categoryParam === String(c.id) || categoryParam === c.slug;
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
                          checked={isChecked}
                          onChange={() => updateParam('category', isChecked ? '' : (c.id || c.slug))}
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
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.875rem' }}>
                Brand
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                  const isChecked = brandParam === String(b.id) || brandParam === b.slug;
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
                          checked={isChecked}
                          onChange={() => updateParam('brand', isChecked ? '' : (b.id || b.slug))}
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
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.875rem' }}>
                Price Range
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="$ Min"
                  className="form-input"
                  value={minPriceParam}
                  onChange={(e) => updateParam('min_price', e.target.value)}
                  style={{ fontSize: '0.8125rem', padding: '0.45rem 0.625rem' }}
                />
                <span style={{ color: '#a1a1aa' }}>-</span>
                <input
                  type="number"
                  placeholder="$ Max"
                  className="form-input"
                  value={maxPriceParam}
                  onChange={(e) => updateParam('max_price', e.target.value)}
                  style={{ fontSize: '0.8125rem', padding: '0.45rem 0.625rem' }}
                />
              </div>
            </div>

            {/* Rating Filter (Screenshot #2) */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#000000', marginBottom: '0.875rem' }}>
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
          >
            <div>
              {/* Top Bar: Search Input + Sorting (Screenshot #2) */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2rem',
                flexWrap: 'wrap',
              }}
            >
              {/* Search Bar matching Screenshot #2 */}
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
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
                  }}
                />
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#71717a',
                  }}
                />
              </div>

              {/* Sort by dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                >
                  <option value="-created_at">Popularity</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                  <option value="-stock">Highest Stock</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <LoadingSpinner message="Fetching products..." />
            ) : products.length > 0 ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1.5rem',
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

      <style>{`
        @media (max-width: 900px) {
          .catalog-layout {
            grid-template-columns: 1fr !important;
          }
          .catalog-products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 550px) {
          .catalog-products-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
export default ProductsPage;
