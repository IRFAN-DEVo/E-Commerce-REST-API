import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Upload,
  Search,
  X,
  Filter,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { StockBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';

export const AdminProductsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Data states
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter options
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Delete modal state
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load category and brand choices for filters
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [cats, brs] = await Promise.all([
          adminApi.getCategories(),
          adminApi.getBrands(),
        ]);
        setCategories(Array.isArray(cats) ? cats : cats?.results || []);
        setBrands(Array.isArray(brs) ? brs : brs?.results || []);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch products with search & filters applied
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (selectedBrand) {
        params.brand = selectedBrand;
      }
      if (selectedStockStatus) {
        params.stock_status = selectedStockStatus;
      }
      if (minPrice && !isNaN(minPrice)) {
        params.min_price = minPrice;
      }
      if (maxPrice && !isNaN(maxPrice)) {
        params.max_price = maxPrice;
      }

      const res = await adminApi.getAdminProducts(params);

      if (Array.isArray(res)) {
        setProducts(res);
        setTotalProducts(res.length);
        setTotalPages(1);
      } else if (res && res.results) {
        setProducts(res.results);
        setTotalProducts(res.count || res.results.length);
        const count = res.count || res.results.length;
        setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
      } else {
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
      }
    } catch (err) {
      showToast('Failed to load products. Please try again.', 'error');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    selectedCategory,
    selectedBrand,
    selectedStockStatus,
    minPrice,
    maxPrice,
    showToast,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedStockStatus('');
    setMinPrice('');
    setMaxPrice('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
    selectedCategory ||
    selectedBrand ||
    selectedStockStatus ||
    minPrice ||
    maxPrice
  );

  // Safe delete flow
  const handleConfirmDelete = async () => {
    if (!deleteModalProduct || isDeleting) return;

    setIsDeleting(true);
    try {
      await adminApi.deleteProduct(deleteModalProduct.id);
      showToast(`Product "${deleteModalProduct.name}" was successfully deleted.`, 'success');
      setDeleteModalProduct(null);
      // Reload products
      fetchProducts();
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to delete product. Please check if it is part of existing orders.';
      showToast(errMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* A. Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#000000',
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            Products
          </h1>
          <p
            style={{
              color: '#71717a',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
              marginBottom: 0,
            }}
          >
            Manage your product catalog, pricing, and inventory.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/admin/products/import"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: '8px',
              border: '1px solid #000000',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f4f4f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            <Upload size={16} />
            <span>Import Products</span>
          </Link>

          <Link
            to="/admin/products/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: '8px',
              border: '1px solid #000000',
              backgroundColor: '#000000',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#27272a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000';
            }}
          >
            <Plus size={16} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* B. Search & Filter Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search Input with Debounce & Clear */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 320px',
              minWidth: '260px',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#71717a',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, SKU, or brand..."
              style={{
                width: '100%',
                padding: '0.625rem 2.5rem 0.625rem 2.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.875rem',
                color: '#000000',
                backgroundColor: '#fafafa',
                outline: 'none',
                transition: 'border-color 150ms ease, background-color 150ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#000000';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.backgroundColor = '#fafafa';
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Toggle Filter Panel */}
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${showFilters || hasActiveFilters ? '#000000' : '#e5e7eb'}`,
              backgroundColor: showFilters ? '#000000' : '#ffffff',
              color: showFilters ? '#ffffff' : '#000000',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <Filter size={16} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: showFilters ? '#ffffff' : '#000000',
                  marginLeft: '0.25rem',
                }}
              />
            )}
          </button>

          {/* Clear Filters Button (shown when filters are active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                color: '#71717a',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#000000';
                e.currentTarget.style.borderColor = '#000000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#71717a';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <RotateCcw size={14} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* C. Expandable Product Filters */}
        {showFilters && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f4f4f5',
            }}
          >
            {/* Category Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#71717a',
                  marginBottom: '0.375rem',
                }}
              >
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fafafa',
                  fontSize: '0.875rem',
                  color: '#000000',
                  outline: 'none',
                }}
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
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#71717a',
                  marginBottom: '0.375rem',
                }}
              >
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fafafa',
                  fontSize: '0.875rem',
                  color: '#000000',
                  outline: 'none',
                }}
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#71717a',
                  marginBottom: '0.375rem',
                }}
              >
                Stock Status
              </label>
              <select
                value={selectedStockStatus}
                onChange={(e) => {
                  setSelectedStockStatus(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fafafa',
                  fontSize: '0.875rem',
                  color: '#000000',
                  outline: 'none',
                }}
              >
                <option value="">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#71717a',
                  marginBottom: '0.375rem',
                }}
              >
                Price Range (₹)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.625rem',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fafafa',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <span style={{ color: '#71717a' }}>–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.625rem',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fafafa',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* D. Product Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  color: '#71717a',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '0.875rem 1rem' }}>Product</th>
                <th style={{ padding: '0.875rem 1rem' }}>SKU</th>
                <th style={{ padding: '0.875rem 1rem' }}>Brand</th>
                <th style={{ padding: '0.875rem 1rem' }}>Category</th>
                <th style={{ padding: '0.875rem 1rem' }}>Price</th>
                <th style={{ padding: '0.875rem 1rem' }}>Stock</th>
                <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '4rem 1rem', textAlign: 'center' }}>
                    <LoadingSpinner message="Loading products..." />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '4rem 1rem', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#71717a',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#f4f4f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem',
                        }}
                      >
                        <Package size={24} color="#71717a" />
                      </div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#000000', margin: 0 }}>
                        No products found
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                        {hasActiveFilters
                          ? 'Try adjusting your search terms or clearing your filters.'
                          : 'Get started by adding your first product or importing in bulk.'}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid #000000',
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Clear All Filters
                        </button>
                      ) : (
                        <Link
                          to="/admin/products/new"
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Add First Product
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isOutOfStock = p.stock <= 0 || !p.is_available;
                  const isLowStock = p.stock > 0 && p.stock <= 5;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background-color 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Product Image & Name */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '6px',
                              backgroundColor: '#f4f4f5',
                              border: '1px solid #e5e7eb',
                              overflow: 'hidden',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <Package size={20} color="#a1a1aa" />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#000000',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                maxWidth: '240px',
                              }}
                              title={p.name}
                            >
                              {p.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                              ID: #{p.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: p.sku ? '#18181b' : '#a1a1aa' }}>
                        {p.sku || '—'}
                      </td>

                      {/* Brand */}
                      <td style={{ padding: '0.875rem 1rem', color: '#3f3f46' }}>
                        {p.brand_name || '—'}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.875rem 1rem', color: '#3f3f46' }}>
                        {p.category_name || '—'}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: '#000000' }}>
                          ₹{Number(p.price).toFixed(2)}
                        </div>
                        {p.discount_price && Number(p.discount_price) > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#71717a', textDecoration: 'line-through' }}>
                            ₹{Number(p.discount_price).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Stock Quantity */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span style={{ fontWeight: 600, color: isOutOfStock ? '#dc2626' : '#000000' }}>
                            {p.stock}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>units</span>
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          {isOutOfStock ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                              }}
                            >
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                              }}
                            >
                              Low Stock ({p.stock})
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                              }}
                            >
                              In Stock
                            </span>
                          )}

                          {!p.is_available && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                backgroundColor: '#f4f4f5',
                                color: '#71717a',
                              }}
                            >
                              Draft / Hidden
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          {/* View Product (Storefront) */}
                          <Link
                            to={`/products/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#ffffff',
                              color: '#52525b',
                              transition: 'all 150ms ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#000000';
                              e.currentTarget.style.borderColor = '#a1a1aa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#52525b';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                            title="View on storefront"
                            aria-label={`View ${p.name} on storefront`}
                          >
                            <Eye size={15} />
                          </Link>

                          {/* Edit Product */}
                          <Link
                            to={`/admin/products/${p.id}/edit`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#ffffff',
                              color: '#000000',
                              transition: 'all 150ms ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#000000';
                              e.currentTarget.style.color = '#ffffff';
                              e.currentTarget.style.borderColor = '#000000';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.color = '#000000';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                            title="Edit product"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit2 size={15} />
                          </Link>

                          {/* Delete Product */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalProduct(p)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fff5f5',
                              color: '#dc2626',
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc2626';
                              e.currentTarget.style.color = '#ffffff';
                              e.currentTarget.style.borderColor = '#dc2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fff5f5';
                              e.currentTarget.style.color = '#dc2626';
                              e.currentTarget.style.borderColor = '#fecaca';
                            }}
                            title="Delete product"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* E. Pagination & Total Count Footer */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1rem 1.25rem',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: '#71717a' }}>
            {totalProducts > 0 ? (
              <span>
                Showing{' '}
                <strong style={{ color: '#000000' }}>
                  {(currentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong style={{ color: '#000000' }}>
                  {Math.min(currentPage * pageSize, totalProducts)}
                </strong>{' '}
                of <strong style={{ color: '#000000' }}>{totalProducts}</strong> products
              </span>
            ) : (
              '0 products'
            )}
          </div>

          <div style={{ marginTop: '-2.5rem' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        </div>
      </div>

      {/* 6. Safe Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          onClick={() => !isDeleting && setDeleteModalProduct(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e5e7eb',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={22} />
              </div>
              <div>
                <h2
                  id="delete-dialog-title"
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Delete Product
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.375rem', marginBottom: 0, lineHeight: 1.5 }}>
                  Are you sure you want to permanently delete{' '}
                  <strong style={{ color: '#000000' }}>
                    "{deleteModalProduct.name}"
                  </strong>
                  {deleteModalProduct.sku && (
                    <span> (SKU: {deleteModalProduct.sku})</span>
                  )}
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid #f4f4f5',
                paddingTop: '1.25rem',
              }}
            >
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalProduct(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#3f3f46',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 150ms ease',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: '0.5rem 1.125rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  transition: 'background-color 150ms ease',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
