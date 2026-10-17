import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  AlertCircle, 
  Package, 
  ShoppingBag, 
  CheckCircle, 
  UserPlus, 
  CreditCard 
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d'); // '7d' | '30d' | '12m'
  const [metricType, setMetricType] = useState('revenue'); // 'revenue' | 'orders'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboard();
      setStats(data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access Denied: Administrative privileges are required to view store metrics.');
      } else {
        setError(err.response?.data?.detail || 'Failed to aggregate store analytics. Please check server connectivity.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Extract chart dataset based on period
  const chartData = useMemo(() => {
    if (!stats) return { labels: [], values: [], hasData: false };

    let src = stats.chart_7days;
    if (selectedPeriod === '30d') src = stats.chart_30days || stats.chart_7days;
    else if (selectedPeriod === '12m') src = stats.chart_monthly;

    const labels = src?.labels || [];
    const values = metricType === 'revenue' ? (src?.revenue || []) : (src?.orders || []);
    const hasData = values.some((v) => Number(v) > 0);

    return { labels, values, hasData };
  }, [stats, selectedPeriod, metricType]);

  // Compute SVG chart coordinates
  const svgMetrics = useMemo(() => {
    const { labels, values } = chartData;
    const width = 500;
    const height = 150;
    const paddingX = 25;
    const paddingY = 20;

    if (!values || values.length === 0) {
      return { points: [], polyline: '', area: '', minVal: 0, maxVal: 0 };
    }

    const numValues = values.map((v) => Number(v) || 0);
    const maxVal = Math.max(...numValues, metricType === 'revenue' ? 100 : 5);
    const minVal = 0;
    const count = numValues.length;
    const stepX = count > 1 ? (width - paddingX * 2) / (count - 1) : 0;

    const points = numValues.map((val, idx) => {
      const x = paddingX + idx * stepX;
      const normalizedY = maxVal > 0 ? val / maxVal : 0;
      const y = height - paddingY - normalizedY * (height - paddingY * 2);
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        val,
        label: labels[idx] || `Point ${idx + 1}`,
      };
    });

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    const area = `${points[0].x},${height - paddingY} ` + polyline + ` ${points[points.length - 1].x},${height - paddingY}`;

    return { points, polyline, area, minVal, maxVal };
  }, [chartData, metricType]);

  // Helper for growth indicator badge
  const renderGrowthBadge = (growthObj) => {
    if (!growthObj || typeof growthObj.percentage !== 'number') {
      return (
        <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500, marginTop: '0.4rem' }}>
          No historical data
        </div>
      );
    }

    const pct = growthObj.percentage;
    const isPositive = pct > 0;
    const isNegative = pct < 0;

    return (
      <div
        style={{
          fontSize: '0.75rem',
          color: isPositive ? '#16a34a' : isNegative ? '#dc2626' : '#71717a',
          fontWeight: 600,
          marginTop: '0.4rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        {isPositive && <TrendingUp size={13} />}
        {isNegative && <TrendingDown size={13} />}
        {!isPositive && !isNegative && <Minus size={13} />}
        <span>
          {isPositive ? `+${pct}%` : `${pct}%`}
        </span>
        <span style={{ color: '#a1a1aa', fontWeight: 400, marginLeft: '0.15rem' }}>
          {growthObj.period || 'vs last month'}
        </span>
      </div>
    );
  };

  // Helper for activity icons
  const getActivityIcon = (type) => {
    switch (type) {
      case 'order_placed':
        return <Package size={14} style={{ color: '#000' }} />;
      case 'order_delivered':
        return <CheckCircle size={14} style={{ color: '#16a34a' }} />;
      case 'welcome':
        return <UserPlus size={14} style={{ color: '#2563eb' }} />;
      case 'payment_success':
        return <CreditCard size={14} style={{ color: '#16a34a' }} />;
      default:
        return <ShoppingBag size={14} style={{ color: '#71717a' }} />;
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '5rem 0', textAlign: 'center' }}>
        <LoadingSpinner message="Aggregating live store metrics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '4rem 1.5rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2.5rem' }}>
          <AlertCircle size={44} style={{ color: '#dc2626', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Dashboard Error</h2>
          <p style={{ color: '#71717a', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={fetchDashboard}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={15} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const revenueTotal = Number(stats?.revenue?.total || 0);
  const ordersTotal = Number(stats?.orders?.total || 0);
  const customersTotal = Number(stats?.users?.total_users || 0);
  const productsTotal = Number(stats?.products?.total_products || 0);

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
            Live database-backed store analytics and fulfillment overview
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>
            As of: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button
            onClick={fetchDashboard}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Refresh Metrics"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Real Database KPI Metric Cards */}
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
            ₹{revenueTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {renderGrowthBadge(stats?.growth?.sales)}
          <div style={{ fontSize: '0.71875rem', color: '#a1a1aa', marginTop: '0.3rem' }}>
            Delivered &amp; settled net revenue
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Total Orders</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', marginTop: '0.4rem' }}>
            {ordersTotal.toLocaleString('en-IN')}
          </div>
          {renderGrowthBadge(stats?.growth?.orders)}
          <div style={{ fontSize: '0.71875rem', color: '#a1a1aa', marginTop: '0.3rem' }}>
            {stats?.orders?.today || 0} today &bull; {stats?.orders?.status?.delivered || 0} delivered
          </div>
        </div>

        {/* Card 3: Customers */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Customers</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', marginTop: '0.4rem' }}>
            {customersTotal.toLocaleString('en-IN')}
          </div>
          {renderGrowthBadge(stats?.growth?.customers)}
          <div style={{ fontSize: '0.71875rem', color: '#a1a1aa', marginTop: '0.3rem' }}>
            Registered customer accounts
          </div>
        </div>

        {/* Card 4: Products */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: '#71717a', fontWeight: 500 }}>Products</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#000000', marginTop: '0.4rem' }}>
            {productsTotal.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.4rem' }}>
            {stats?.products?.active_products || 0} active
          </div>
          <div style={{ fontSize: '0.71875rem', color: '#a1a1aa', marginTop: '0.3rem' }}>
            {stats?.products?.low_stock_products || 0} low stock &bull; {stats?.products?.out_of_stock_products || 0} out of stock
          </div>
        </div>
      </div>

      {/* Analytics Chart + Recent Orders Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '1.5rem' }} className="admin-body-grid">
        
        {/* Sales Overview Card */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000000', margin: 0 }}>
                {metricType === 'revenue' ? 'Sales Revenue Analytics' : 'Order Volume Analytics'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                {selectedPeriod === '7d' ? 'Last 7 Days (Daily)' : selectedPeriod === '30d' ? 'Last 30 Days (Daily)' : 'Last 12 Months (Monthly)'}
              </span>
            </div>

            {/* Period and Metric Switchers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setMetricType('revenue')}
                  style={{
                    border: 'none',
                    background: metricType === 'revenue' ? '#000000' : 'transparent',
                    color: metricType === 'revenue' ? '#ffffff' : '#71717a',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ₹ Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setMetricType('orders')}
                  style={{
                    border: 'none',
                    background: metricType === 'orders' ? '#000000' : 'transparent',
                    color: metricType === 'orders' ? '#ffffff' : '#71717a',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Orders
                </button>
              </div>

              <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: '6px', padding: '2px' }}>
                {['7d', '30d', '12m'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedPeriod(period)}
                    style={{
                      border: 'none',
                      background: selectedPeriod === period ? '#000000' : 'transparent',
                      color: selectedPeriod === period ? '#ffffff' : '#71717a',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {period.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Dynamic SVG Line/Area Chart */}
          <div style={{ position: 'relative', width: '100%', height: '175px', borderBottom: '1px solid #f4f4f5', paddingBottom: '0.5rem' }}>
            <svg
              viewBox="0 0 500 150"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000000" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid guide lines */}
              <line x1="25" y1="20" x2="475" y2="20" stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="25" y1="75" x2="475" y2="75" stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="25" y1="130" x2="475" y2="130" stroke="#e4e4e7" strokeWidth="1" />

              {/* Area polygon fill */}
              {svgMetrics.points.length > 1 && (
                <polygon
                  fill="url(#chartGradient)"
                  points={svgMetrics.area}
                />
              )}

              {/* Line stroke */}
              {svgMetrics.points.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={svgMetrics.polyline}
                />
              )}

              {/* Interactive Data Dots */}
              {svgMetrics.points.map((p, idx) => {
                const isHovered = hoveredPoint?.idx === idx;
                // For 30d, render fewer circles to maintain minimalist look unless hovered
                const shouldRenderDot = selectedPeriod !== '30d' || idx % 3 === 0 || isHovered;

                if (!shouldRenderDot) return null;

                return (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 3.5}
                    fill={isHovered ? '#ffffff' : '#000000'}
                    stroke="#000000"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                    onMouseEnter={() => setHoveredPoint({ ...p, idx })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>

            {/* Floating Point Tooltip */}
            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(hoveredPoint.x / 500) * 100}%`,
                  top: `${(hoveredPoint.y / 150) * 100}%`,
                  transform: 'translate(-50%, -120%)',
                  background: '#000000',
                  color: '#ffffff',
                  padding: '0.3rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 10,
                }}
              >
                {hoveredPoint.label}: {metricType === 'revenue' ? `₹${Number(hoveredPoint.val).toFixed(2)}` : `${hoveredPoint.val} orders`}
              </div>
            )}

            {!chartData.hasData && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8125rem',
                  color: '#71717a',
                  fontWeight: 500,
                }}
              >
                No sales recorded in this period
              </div>
            )}
          </div>

          {/* Sparse X-Axis Date Labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.4rem 0.5rem 0',
              fontSize: '0.6875rem',
              color: '#a1a1aa',
            }}
          >
            {chartData.labels.length > 0 ? (
              selectedPeriod === '30d' ? (
                // Sparse for 30d: first, middle intervals, and last
                chartData.labels
                  .filter((_, idx, arr) => idx === 0 || idx === Math.floor(arr.length / 3) || idx === Math.floor((arr.length * 2) / 3) || idx === arr.length - 1)
                  .map((lbl, i) => <span key={i}>{lbl}</span>)
              ) : selectedPeriod === '12m' ? (
                // Every 2 months for 12m
                chartData.labels
                  .filter((_, idx) => idx % 2 === 0)
                  .map((lbl, i) => <span key={i}>{lbl}</span>)
              ) : (
                // All 7 days
                chartData.labels.map((lbl, i) => <span key={i}>{lbl}</span>)
              )
            ) : (
              <span>No dates available</span>
            )}
          </div>

          {/* Recent Daily Activity List */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Recent Store Activity</span>
              <span style={{ fontSize: '0.6875rem', color: '#71717a', fontWeight: 400 }}>Chronological log</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.slice(0, 4).map((item, index) => (
                  <div
                    key={item.id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      fontSize: '0.8125rem',
                      padding: '0.35rem 0',
                      borderBottom: index < 3 ? '1px solid #fafafa' : 'none',
                    }}
                  >
                    <div style={{ marginTop: '0.15rem' }}>
                      {getActivityIcon(item.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#000000', lineHeight: 1.3 }}>
                        {item.title}
                      </div>
                      <div style={{ color: '#52525b', fontSize: '0.75rem', marginTop: '0.1rem', wordBreak: 'break-word' }}>
                        {item.description}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8125rem', color: '#71717a', padding: '1rem 0', textAlign: 'center' }}>
                  No recent store activity recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real Recent Orders Card */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000000', margin: 0 }}>Recent Orders</h2>
            <Link to="/admin/orders" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#000000' }}>
              View All
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stats?.recent_orders && stats.recent_orders.length > 0 ? (
              stats.recent_orders.slice(0, 5).map((row) => {
                const isDelivered = row.status === 'DELIVERED';
                const isProcessing = row.status === 'PROCESSING';
                const isCancelled = row.status === 'CANCELLED';

                return (
                  <div
                    key={row.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.875rem 0',
                      borderBottom: '1px solid #f4f4f5',
                      fontSize: '0.875rem',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <Link
                        to="/admin/orders"
                        style={{ fontWeight: 600, color: '#000000', textDecoration: 'none' }}
                      >
                        {row.order_number || `#ORD${row.id}`}
                      </Link>
                      <div style={{ fontSize: '0.71875rem', color: '#71717a', marginTop: '0.15rem' }}>
                        {row.customer || row.email || 'Customer'} &bull; {row.date || 'Recent'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: '#000000', fontSize: '0.875rem' }}>
                        ₹{Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: isDelivered ? '#f0fdf4' : isProcessing ? '#fafafa' : isCancelled ? '#fef2f2' : '#f4f4f5',
                          color: isDelivered ? '#16a34a' : isCancelled ? '#dc2626' : '#000000',
                          border: '1px solid #e5e7eb',
                          textTransform: 'capitalize',
                        }}
                      >
                        {row.status ? row.status.toLowerCase() : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2.5rem 0', textAlign: 'center', color: '#71717a', fontSize: '0.875rem' }}>
                No customer orders placed yet.
              </div>
            )}
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
        @media (max-width: 640px) {
          .admin-kpi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboardPage;
