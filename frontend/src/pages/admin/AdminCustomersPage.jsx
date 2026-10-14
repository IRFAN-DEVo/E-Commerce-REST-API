import React, { useState, useEffect } from 'react';
import { Users, Search, Mail, ShieldCheck, Calendar } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getCustomers({ search: searchQuery });
      setCustomers(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      showToast('Failed to load customers.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const filtered = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    const username = (c.username || '').toLowerCase();
    return name.includes(q) || email.includes(q) || username.includes(q);
  });

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
            Customers Management
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem', marginBottom: 0 }}>
            View and manage registered customer accounts and roles
          </p>
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.25rem', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {isLoading && customers.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <LoadingSpinner message="Loading customer accounts..." />
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
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Date Joined</th>
                  <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'Customer';
                  const initial = fullName[0].toUpperCase();
                  const isOwner = c.is_owner || c.is_staff || c.role === 'OWNER';

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: isOwner ? '#18181b' : '#f4f4f5',
                            color: isOwner ? '#ffffff' : '#18181b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{c.id}</div>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Mail size={14} color="#a1a1aa" />
                          <span>{c.email || 'No email provided'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: isOwner ? '#f4f4f5' : '#eff6ff',
                            color: isOwner ? '#000000' : '#2563eb',
                            border: isOwner ? '1px solid #e4e4e7' : '1px solid #bfdbfe',
                          }}
                        >
                          {isOwner ? 'Store Owner' : 'Customer'}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {c.date_joined ? new Date(c.date_joined).toLocaleDateString() : 'Active User'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#16a34a',
                            backgroundColor: '#f0fdf4',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          <ShieldCheck size={12} />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No customers found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomersPage;
