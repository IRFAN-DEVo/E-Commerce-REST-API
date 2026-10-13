/**
 * DjangoMart Admin - JavaScript
 * All charts and stats use real data fetched from DRF REST APIs.
 */

if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748b';
    Chart.defaults.scale.grid.color = '#f1f5f9';
    Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.elements.line.tension = 0.4;
}

function fmtMoney(val) {
    return '$' + parseFloat(val || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function fmtNum(val) {
    return parseInt(val || 0).toLocaleString('en-US');
}

function buildChart(id, config) {
    const el = document.getElementById(id);
    if (!el) return null;
    return new Chart(el, config);
}

// ── API Fetchers ─────────────────────────────────────────────────────────────

async function fetchDashboardData() {
    try {
        const response = await authAPI.fetchWithAuth('/dashboard/', { method: 'GET' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                authAPI.logout();
                return;
            }
            throw new Error('API response not ok: ' + response.statusText);
        }

        const data = await response.json();

        // ── Stat Cards ────────────────────────────────────────────────────
        function setCard(valId, trendId, value, trendHtml) {
            const v = document.getElementById(valId);
            const t = document.getElementById(trendId);
            if (v) v.textContent = value;
            if (t) t.innerHTML = trendHtml;
        }

        setCard('stat-products', 'trend-products',
            fmtNum(data.products.total_products),
            `<i class="fas fa-circle-check"></i> ${data.products.active_products} active`);

        setCard('stat-categories', 'trend-categories',
            fmtNum(data.products.total_categories),
            `<i class="fas fa-layer-group"></i> Total categories`);

        setCard('stat-brands', 'trend-brands',
            fmtNum(data.products.total_brands),
            `<i class="fas fa-copyright"></i> Total brands`);

        setCard('stat-orders', 'trend-orders',
            fmtNum(data.orders.total),
            `<i class="fas fa-shopping-bag"></i> ${data.orders.today} today`);

        setCard('stat-revenue', 'trend-revenue',
            fmtMoney(data.revenue.total),
            `<i class="fas fa-dollar-sign"></i> ${fmtMoney(data.revenue.today)} today`);

        setCard('stat-customers', 'trend-customers',
            fmtNum(data.users.total_users),
            `<i class="fas fa-user-plus"></i> ${data.users.new_customers_today} joined today`);

        setCard('stat-reviews', 'trend-reviews',
            fmtNum(data.statistics.total_reviews),
            `<i class="fas fa-star"></i> Avg ${parseFloat(data.statistics.average_rating).toFixed(1)} ★`);

        setCard('stat-coupons', 'trend-coupons',
            fmtNum(data.coupons.active),
            `<i class="fas fa-ticket-alt"></i> Active coupons`);

        // New cards
        setCard('stat-pending', 'trend-pending',
            fmtNum(data.orders.status.pending),
            `<i class="fas fa-clock"></i> Awaiting processing`);

        setCard('stat-delivered', 'trend-delivered',
            fmtNum(data.orders.status.delivered),
            `<i class="fas fa-check-circle"></i> ${data.orders.delivered_today} delivered today`);

        setCard('stat-lowstock', 'trend-lowstock',
            fmtNum(data.products.low_stock_products),
            `<i class="fas fa-box-open"></i> ${data.products.out_of_stock_products} out of stock`);

        setCard('stat-today-revenue', 'trend-today-revenue',
            fmtMoney(data.revenue.today),
            `<i class="fas fa-chart-line"></i> ${fmtMoney(data.revenue.weekly)} this week`);

        // ── Tables ────────────────────────────────────────────────────────
        populateRecentOrders(data.recent_orders);
        populateTopProducts(data.top_products);

        // ── Charts ────────────────────────────────────────────────────────
        initDashboardCharts(data.chart_7days, data.chart_monthly, data.chart_orders, data.chart_payments);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}


async function fetchFluctuationData() {
    try {
        const response = await authAPI.fetchWithAuth('/dashboard/fluctuations/', {
            method: 'GET'
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '../login.html';
                return;
            }
            throw new Error('API response not ok: ' + response.statusText);
        }
        
        const data = await response.json();

        // Populate stats
        document.getElementById('fluct-today-sales').textContent = fmtMoney(data.today_sales);
        document.getElementById('fluct-yesterday-sales').textContent = `vs ${fmtMoney(data.yesterday_sales)} yesterday`;

        const growthEl = document.getElementById('fluct-daily-growth');
        const growth = parseFloat(data.daily_growth);
        if (growth >= 0) {
            growthEl.className = "fluct-trend trend-up";
            growthEl.innerHTML = `<i class="fas fa-arrow-up"></i> ${growth}%`;
        } else {
            growthEl.className = "fluct-trend trend-down";
            growthEl.innerHTML = `<i class="fas fa-arrow-down"></i> ${growth}%`;
        }

        document.getElementById('fluct-weekly-sales').textContent = fmtMoney(data.weekly_sales);
        document.getElementById('fluct-monthly-sales').textContent = fmtMoney(data.monthly_sales);

        // Initialize charts
        initFluctuationCharts(data, data.chart_7days, data.chart_monthly, data.chart_orders, data.chart_payments);

    } catch (error) {
        console.error("Error fetching fluctuation data:", error);
    }
}

// ── DOM Table Builders ───────────────────────────────────────────────────────

function populateRecentOrders(orders) {
    const tbody = document.getElementById('recent-orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No recent orders.</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const tr = document.createElement('tr');
        const initial = o.customer ? o.customer.charAt(0).toUpperCase() : '?';
        const statusClass = `status-${o.status.toLowerCase()}`;
        
        tr.innerHTML = `
            <td><strong>#${o.id}</strong></td>
            <td>
                <div class="table-user">
                    <div class="table-user-avatar">${initial}</div>
                    ${o.customer}
                </div>
            </td>
            <td>${o.date}</td>
            <td><strong>${fmtMoney(o.total)}</strong></td>
            <td><span class="badge order-status-badge ${statusClass}">${o.status}</span></td>
            <td><a href="#" class="btn btn-outline btn-xs">View</a></td>
        `;
        tbody.appendChild(tr);
    });
}

function populateTopProducts(products) {
    const tbody = document.getElementById('top-products-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!products || products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No top products.</td></tr>`;
        return;
    }

    products.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="rank-badge rank-${idx + 1}">#${idx + 1}</span></td>
            <td>
                <div class="table-product">
                    <div class="table-product-placeholder" aria-hidden="true">${p.name.charAt(0)}</div>
                    <a href="/products/${p.id}/">${p.name}</a>
                </div>
            </td>
            <td>${p.category}</td>
            <td><strong>${fmtNum(p.sales)}</strong></td>
            <td><strong>${fmtMoney(p.revenue)}</strong></td>
            <td>
                <span class="rating-inline">
                    <i class="fas fa-star" style="color:#fbbf24;" aria-hidden="true"></i> -
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ── Chart Initializers ───────────────────────────────────────────────────────

function initDashboardCharts(chart7days, chartMonthly, chartOrders, chartPayments) {
    if (!chart7days) return;

    buildChart('revenueChart', {
        type: 'line',
        data: {
            labels: chart7days.labels,
            datasets: [{
                label: 'Revenue',
                data: chart7days.revenue,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79,70,229,0.10)',
                borderWidth: 3,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#4f46e5',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => fmtMoney(c.parsed.y) } }
            },
            scales: {
                y: { beginAtZero: true, border: { display: false }, ticks: { callback: v => '$' + v.toLocaleString() } },
                x: { border: { display: false }, grid: { display: false } }
            }
        }
    });

    buildChart('categoryChart', {
        type: 'doughnut',
        data: {
            labels: chartOrders.labels,
            datasets: [{
                data: chartOrders.data,
                backgroundColor: ['#f59e0b','#3b82f6','#8b5cf6','#10b981','#ef4444'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
                title: { display: true, text: 'Order Status Breakdown', padding: { bottom: 8 }, font: { size: 13 } }
            }
        }
    });

    buildChart('ordersChart', {
        type: 'bar',
        data: {
            labels: chart7days.labels,
            datasets: [{
                label: 'Orders',
                data: chart7days.orders,
                backgroundColor: '#10b981',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Orders – Last 7 Days', padding: { bottom: 8 }, font: { size: 13 } }
            },
            scales: {
                y: { beginAtZero: true, border: { display: false }, ticks: { precision: 0 } },
                x: { border: { display: false }, grid: { display: false } }
            }
        }
    });

    buildChart('monthlyRevenueChart', {
        type: 'bar',
        data: {
            labels: chartPayments.labels,
            datasets: [{
                label: 'Payments',
                data: chartPayments.data,
                backgroundColor: ['#10b981','#f59e0b','#ef4444','#3b82f6'],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Payment Status', padding: { bottom: 8 }, font: { size: 13 } }
            },
            scales: {
                y: { beginAtZero: true, border: { display: false }, ticks: { precision: 0 } },
                x: { border: { display: false }, grid: { display: false } }
            }
        }
    });

    buildChart('customerGrowthChart', {
        type: 'bar',
        data: {
            labels: chartMonthly.labels,
            datasets: [{
                label: 'Revenue',
                data: chartMonthly.revenue,
                backgroundColor: chartMonthly.revenue.map((v) => v > 0 ? '#4f46e5' : '#e2e8f0'),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: `Monthly Revenue – ${chartMonthly.year}`, padding: { bottom: 8 }, font: { size: 13 } },
                tooltip: { callbacks: { label: c => fmtMoney(c.parsed.y) } }
            },
            scales: {
                y: { beginAtZero: true, border: { display: false }, ticks: { callback: v => '$' + v.toLocaleString() } },
                x: { border: { display: false }, grid: { display: false } }
            }
        }
    });
}

function initFluctuationCharts(fluct, chart7days, chartMonthly, chartOrders, chartPayments) {
    if (!chart7days) return;

    const todaySales     = parseFloat(fluct.today_sales) || 0;
    const yesterdaySales = parseFloat(fluct.yesterday_sales) || 0;
    const weeklySales    = parseFloat(fluct.weekly_sales) || 0;
    const monthlySales   = parseFloat(fluct.monthly_sales) || 0;
    const dailyGrowth    = parseFloat(fluct.daily_growth) || 0;

    function sparkline(id, sparkData, color) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sparkData.map((_, i) => i),
                datasets: [{ data: sparkData, borderColor: color, borderWidth: 2, fill: false, pointRadius: 0 }]
            },
            options: {
                responsive: false, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false, min: Math.min(...sparkData)*0.8, max: Math.max(...sparkData)*1.2 } }
            }
        });
    }

    sparkline('sparkRevenue', chart7days.revenue, '#4f46e5');
    sparkline('sparkOrders', chart7days.orders, '#f59e0b');
    sparkline('sparkCustomers', chartMonthly.revenue, '#10b981');

    buildChart('revenueTrendChart', {
        type: 'bar',
        data: {
            labels: ['Yesterday', 'Today', 'Last 7 Days', 'This Month'],
            datasets: [{
                label: 'Revenue ($)',
                data: [yesterdaySales, todaySales, weeklySales, monthlySales],
                backgroundColor: [dailyGrowth >= 0 ? '#94a3b8' : '#ef4444', dailyGrowth >= 0 ? '#10b981' : '#f59e0b', '#3b82f6', '#4f46e5'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: 'Sales Overview' }, tooltip: { callbacks: { label: c => fmtMoney(c.parsed.y) } } },
            scales: { y: { beginAtZero: true, border: { display: false } }, x: { border: { display: false }, grid: { display: false } } }
        }
    });

    const growthAbs = Math.min(Math.abs(dailyGrowth), 100);
    buildChart('ordersTrendChart', {
        type: 'doughnut',
        data: {
            labels: [dailyGrowth >= 0 ? 'Growth' : 'Decline', 'Remaining'],
            datasets: [{ data: [growthAbs, Math.max(100 - growthAbs, 0)], backgroundColor: [dailyGrowth >= 0 ? '#10b981' : '#ef4444', '#f1f5f9'], borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, rotation: -90, circumference: 180, cutout: '72%',
            plugins: { legend: { display: false }, title: { display: true, text: `Daily Growth: ${dailyGrowth >= 0 ? '+' : ''}${dailyGrowth}%`, font: { size: 15, weight: 'bold' }, color: dailyGrowth >= 0 ? '#10b981' : '#ef4444' } }
        }
    });

    buildChart('customerTrendChart', {
        type: 'line',
        data: {
            labels: chart7days.labels,
            datasets: [{
                label: 'Revenue', data: chart7days.revenue, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.08)',
                borderWidth: 3, fill: true, pointRadius: 5, pointBackgroundColor: '#fff', pointBorderColor: '#4f46e5'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.parsed.y) } } },
            scales: { y: { beginAtZero: true, border: { display: false } }, x: { border: { display: false }, grid: { display: false } } }
        }
    });

    buildChart('weeklyTrendChart', {
        type: 'bar',
        data: {
            labels: chart7days.labels,
            datasets: [{ label: 'Orders', data: chart7days.orders, backgroundColor: '#10b981', borderRadius: 5 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, border: { display: false } }, x: { border: { display: false }, grid: { display: false } } }
        }
    });

    buildChart('monthlyTrendChart', {
        type: 'bar',
        data: {
            labels: chartMonthly.labels,
            datasets: [{ label: 'Revenue', data: chartMonthly.revenue, backgroundColor: chartMonthly.revenue.map(v => v > 0 ? '#4f46e5' : '#e2e8f0'), borderRadius: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.parsed.y) } } },
            scales: { y: { beginAtZero: true, border: { display: false } }, x: { border: { display: false }, grid: { display: false } } }
        }
    });
}
