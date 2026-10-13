import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, RotateCcw } from 'lucide-react';
import { productsApi } from '../api/products';
import { ProductCard } from '../components/products/ProductCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { EmptyState } from '../components/common/EmptyState';

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
      if (categoryParam) params.category = categoryParam;
      if (brandParam) params.brand = brandParam;
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
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Product Catalog
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
          {totalCount} products available
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }} className="catalog-layout">
        {/* Sidebar Filters */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
          className="catalog-filters"
        >
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={18} />
                <span>Filters</span>
              </span>
              {(categoryParam || brandParam || searchParam || minPriceParam || maxPriceParam) && (
                <button
                  onClick={handleResetFilters}
                  style={{ fontSize: '0.75rem', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={categoryParam}
                onChange={(e) => updateParam('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div className="form-group">
              <label className="form-label">Brand</label>
              <select
                className="form-select"
                value={brandParam}
                onChange={(e) => updateParam('brand', e.target.value)}
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div className="form-group">
              <label className="form-label">Price Range (₹)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="Min"
                  className="form-input"
                  value={minPriceParam}
                  onChange={(e) => updateParam('min_price', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="form-input"
                  value={maxPriceParam}
                  onChange={(e) => updateParam('max_price', e.target.value)}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Catalog Main Content */}
        <div>
          {/* Top Control Bar (Search & Sort) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}
          >
            {/* Search Filter Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Search products in view..."
                className="form-input"
                value={searchParam}
                onChange={(e) => updateParam('search', e.target.value)}
                style={{ paddingRight: '2rem' }}
              />
              <Search
                size={16}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>

            {/* Ordering Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Sort by:</span>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={orderingParam}
                onChange={(e) => updateParam('ordering', e.target.value)}
              >
                <option value="-created_at">Newest First</option>
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
              <div className="grid-products">
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
      </div>

      <style>{`
        @media (max-width: 768px) {
          .catalog-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
