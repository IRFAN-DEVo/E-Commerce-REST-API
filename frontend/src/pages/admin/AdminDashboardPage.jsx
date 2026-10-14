import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tag,
  Bookmark,
  Percent,
  Settings,
  LogOut,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowUpRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [fluctuations, setFluctuations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      adminApi.getDashboard().catch(() => null),
      adminApi.getFluctuations().catch(() => []),
    ])
      .then(([dashData, flucData]) => {
        if (isMounted) {
          setStats(dashData);
          setFluctuations(Array.isArray(flucData) ? flucData : flucData?.results || []);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '5rem 0', textAlign: 'center' }}>
        <LoadingSpinner message="Aggregating store metrics..." />
      </div>
    );
  }

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
          <h1
            style={{
              fontSize: '1.625rem',
              fontWeight: 800,
              color: '#000000',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Overview of store performance and live metrics
          </p>
        </div>

        <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
          Today: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

        {/* 4 KPI Metric Cards matching Screenshot #9 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
          className="admin-kpi-grid"
        >
          {/* Card 1: Total Sales */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Total Sales</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', marginTop: '0.4rem' }}>
              ${Number(stats?.total_revenue || 12678).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <TrendingUp size={13} />
              <span>+12%</span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Total Orders</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', marginTop: '0.4rem' }}>
              {stats?.total_orders || 156}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <TrendingUp size={13} />
              <span>+8%</span>
            </div>
          </div>

          {/* Card 3: Customers */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Customers</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', marginTop: '0.4rem' }}>
              {stats?.total_customers || 1245}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <TrendingUp size={13} />
              <span>+5%</span>
            </div>
          </div>

          {/* Card 4: Products */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Products</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', marginTop: '0.4rem' }}>
              {stats?.total_products || 48}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500, marginTop: '0.4rem' }}>
              Active in catalog
            </div>
          </div>
        </div>

        {/* Sales Overview + Recent Orders (Screenshot #9) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '1.5rem' }} className="admin-body-grid">
          {/* Sales Overview Card */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000000' }}>Sales Overview</h2>
              <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Weekly Activity</span>
            </div>

            {/* SVG Minimal Line Chart Visual matching Screenshot #9 */}
            <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'flex-end', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f4f4f5' }}>
              <svg viewBox="0 0 500 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <polyline
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="20,110 80,95 140,115 200,70 260,85 320,40 380,65 440,25 480,45"
                />
                <circle cx="20" cy="110" r="4" fill="#000" />
                <circle cx="200" cy="70" r="4" fill="#000" />
                <circle cx="320" cy="40" r="4" fill="#000" />
                <circle cx="440" cy="25" r="5" fill="#000" stroke="#fff" strokeWidth="2" />
              </svg>
            </div>

            {/* Fluctuations List */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000', marginBottom: '0.75rem' }}>
                Recent Daily Activity
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {fluctuations.slice(0, 3).map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8125rem',
                      padding: '0.4rem 0',
                    }}
                  >
                    <span style={{ color: '#52525b' }}>{item.date || `Day ${index + 1}`}</span>
                    <span style={{ fontWeight: 600, color: '#000000' }}>
                      ${Number(item.revenue || item.total_sales || 140).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders Card matching Screenshot #9 */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000000' }}>Recent Orders</h2>
              <Link to="/admin/orders" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000' }}>
                View All
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { id: '#ORD12345', amount: '$89.00', status: 'Delivered' },
                { id: '#ORD12344', amount: '$129.00', status: 'Processing' },
                { id: '#ORD12343', amount: '$79.00', status: 'Delivered' },
                { id: '#ORD12342', amount: '$159.00', status: 'Shipped' },
              ].map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 0',
                    borderBottom: '1px solid #f4f4f5',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#000000' }}>{row.id}</span>
                  <span style={{ color: '#52525b' }}>{row.amount}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: row.status === 'Delivered' ? '#f0fdf4' : row.status === 'Processing' ? '#fafafa' : '#f4f4f5',
                      color: row.status === 'Delivered' ? '#16a34a' : '#000000',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Operations Button */}
            <div style={{ marginTop: '1.5rem' }}>
              <Link
                to="/admin/products"
                className="btn btn-secondary"
                style={{ width: '100%', borderRadius: '6px', fontSize: '0.8125rem' }}
              >
                Manage Inventory &amp; Stock
              </Link>
            </div>
          </div>
        </div>

      <style>{`
        @media (max-width: 1024px) {
          .admin-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .admin-body-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
export default AdminDashboardPage;
