import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, X } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminBrandsPage = () => {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadBrands = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getBrands();
      setBrands(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load brands.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter brand name.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.createBrand({ name: name.trim() });
      showToast('Brand created successfully.', 'success');
      setName('');
      setIsModalOpen(false);
      loadBrands();
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create brand.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, brandName) => {
    if (!window.confirm(`Are you sure you want to delete brand "${brandName}"?`)) return;

    try {
      await adminApi.deleteBrand(id);
      showToast(`Brand "${brandName}" deleted.`, 'info');
      loadBrands();
    } catch (err) {
      showToast('Failed to delete brand.', 'error');
    }
  };

  return (
    <div>
      {/* Top Header */}
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
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#000000', margin: 0 }}>
            Store Brands &amp; Manufacturers
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Manage product manufacturers, labels, and partners
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
        >
          <Plus size={16} />
          <span>Add Brand</span>
        </button>
      </div>

      {isLoading && brands.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <LoadingSpinner message="Loading brands catalog..." />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--gray-50)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Brand Name</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Slug</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#f4f4f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#18181b',
                          }}
                        >
                          <Tag size={16} />
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {b.slug || b.name?.toLowerCase().replace(/\s+/g, '-')}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger-600)' }}
                        title="Delete Brand"
                        aria-label={`Delete brand ${b.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

                {brands.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No brands added yet. Click "Add Brand" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Brand Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', backgroundColor: '#ffffff', borderRadius: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Add New Brand</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Brand Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Nike, Apple, Samsung"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBrandsPage;
