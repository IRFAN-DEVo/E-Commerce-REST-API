import React, { useState, useEffect } from 'react';
import { Trash2, Package } from 'lucide-react';
import { productsApi } from '../../api/products';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { StockBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productsApi.getProducts({ page_size: 50 });
      setProducts(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load products.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
      await adminApi.deleteProduct(productId);
      showToast(`Product "${productName}" deleted.`, 'info');
      loadProducts();
    } catch (err) {
      showToast('Failed to delete product.', 'error');
    }
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <LoadingSpinner message="Loading catalog items..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Manage Product Inventory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Inspect available items, prices, and stock units
          </p>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Product</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Stock</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--gray-100)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Package size={20} color="var(--gray-400)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      {p.brand_name && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.brand_name}</div>}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>
                    {p.category_name || '-'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                    ₹{Number(p.price).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <StockBadge stock={p.stock} isAvailable={p.is_available} />
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger-600)' }}
                      title="Delete Product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No products in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
