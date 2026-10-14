import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, X, Tag } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getCategories();
      setCategories(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load categories.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter category name.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.createCategory({ name: name.trim(), description: description.trim() });
      showToast('Category created successfully.', 'success');
      setName('');
      setDescription('');
      setIsModalOpen(false);
      loadCategories();
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create category.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      await adminApi.deleteCategory(id);
      showToast(`Category "${catName}" deleted.`, 'info');
      loadCategories();
    } catch (err) {
      showToast('Failed to delete category.', 'error');
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
            Store Categories
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Organize products into customer-facing departments and taxonomy
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      {isLoading && categories.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <LoadingSpinner message="Loading store categories..." />
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
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Category Name</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Slug</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                          <Bookmark size={16} />
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-')}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                      {cat.description || 'No description provided'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger-600)' }}
                        title="Delete Category"
                        aria-label={`Delete category ${cat.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No categories created yet. Click "Add Category" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
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
            style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', backgroundColor: '#ffffff', borderRadius: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Add New Category</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Footwear, Electronics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Description
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Optional brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  {isSubmitting ? 'Creating...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoriesPage;
