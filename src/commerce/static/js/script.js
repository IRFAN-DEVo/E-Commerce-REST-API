/**
 * DjangoMart - Main JavaScript
 * Handles global interactions, mobile navigation, tooltips, etc.
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ─────────────────────────────────────────────
       Mobile Menu Toggle
       Full-screen drawer with overlay + scroll lock
    ───────────────────────────────────────────── */
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const primaryNav    = document.getElementById('primary-nav');
    const mobileOverlay = document.getElementById('mobile-nav-overlay');

    if (mobileMenuBtn && primaryNav) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = primaryNav.classList.toggle('show');
            if (mobileOverlay) mobileOverlay.classList.toggle('show', isOpen);
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);

            if (isOpen) {
                mobileMenuBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            } else {
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
                document.body.style.overflow = '';
            }
        });

        // Close mobile nav when a nav-link is clicked
        primaryNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768 && primaryNav.classList.contains('show')) {
                    closeMobileNavInternal();
                }
            });
        });
    }

    function closeMobileNavInternal() {
        if (primaryNav) primaryNav.classList.remove('show');
        if (mobileOverlay) mobileOverlay.classList.remove('show');
        if (mobileMenuBtn) {
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
        document.body.style.overflow = '';
    }

    // Close nav on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileNavInternal();
        }
    });

    /* ─────────────────────────────────────────────
       Header Scroll Effect
    ───────────────────────────────────────────── */
    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    /* ─────────────────────────────────────────────
       User Dropdown Menu
    ───────────────────────────────────────────── */
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        const trigger = userMenu.querySelector('.user-menu-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('open');
                trigger.setAttribute('aria-expanded', userMenu.classList.contains('open'));
            });
        }

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                userMenu.classList.remove('open');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /* ─────────────────────────────────────────────
       Auto-dismiss messages after 5 seconds
    ───────────────────────────────────────────── */
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
        setTimeout(() => {
            if (msg && msg.parentElement) {
                msg.style.opacity = '0';
                msg.style.transform = 'translateY(-10px)';
                msg.style.transition = 'all 0.3s ease';
                setTimeout(() => msg.remove(), 300);
            }
        }, 5000);
    });
});


/* ─────────────────────────────────────────────
   Products Page Filters Toggle (Mobile)
   Opens a full-screen overlay with backdrop
───────────────────────────────────────────── */
function toggleFilters() {
    const sidebar  = document.getElementById('filters-sidebar');
    const btn      = document.getElementById('filter-toggle-btn');
    const isMobile = window.innerWidth <= 768;

    if (!sidebar) return;

    const isShowing = sidebar.classList.toggle('show');
    if (btn) btn.setAttribute('aria-expanded', isShowing);

    if (isMobile) {
        // Ensure mobile close button exists inside sidebar
        let mobileHeader = sidebar.querySelector('.filter-mobile-header');
        if (!mobileHeader && isShowing) {
            mobileHeader = document.createElement('div');
            mobileHeader.className = 'filter-mobile-header';
            mobileHeader.innerHTML = `
                <h3><i class="fas fa-sliders-h"></i> Filters</h3>
                <button class="filter-mobile-close-btn" onclick="toggleFilters()" aria-label="Close filters">
                    <i class="fas fa-times"></i>
                </button>
            `;
            sidebar.insertBefore(mobileHeader, sidebar.firstChild);
        }

        // Backdrop overlay
        let backdrop = document.getElementById('filter-overlay-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'filter-overlay-backdrop';
            backdrop.className = 'filter-overlay-backdrop';
            backdrop.onclick = () => toggleFilters();
            document.body.appendChild(backdrop);
        }
        backdrop.classList.toggle('show', isShowing);

        // Body scroll lock
        document.body.style.overflow = isShowing ? 'hidden' : '';
    }
}

/* ─────────────────────────────────────────────
   Clear all filters in the sidebar
───────────────────────────────────────────── */
function clearFilters() {
    const form = document.getElementById('filters-form');
    if (form) {
        const inputs = form.querySelectorAll('input[type="checkbox"]');
        inputs.forEach(input => input.checked = false);
        const numbers = form.querySelectorAll('input[type="number"]');
        numbers.forEach(input => input.value = '');
        const search = form.querySelector('input[type="text"]');
        if (search) search.value = '';
        form.submit();
    }
}


/* ─────────────────────────────────────────────
   Grid/List view toggle on products page
───────────────────────────────────────────── */
function setView(viewMode) {
    const grid    = document.getElementById('product-grid');
    const gridBtn = document.getElementById('grid-view-btn');
    const listBtn = document.getElementById('list-view-btn');
    
    if (!grid || !gridBtn || !listBtn) return;

    if (viewMode === 'list') {
        grid.style.gridTemplateColumns = '1fr';
        grid.classList.add('product-list-view');

        listBtn.classList.add('active');
        listBtn.setAttribute('aria-pressed', 'true');
        gridBtn.classList.remove('active');
        gridBtn.setAttribute('aria-pressed', 'false');

        localStorage.setItem('djangomart_view_pref', 'list');
    } else {
        grid.style.gridTemplateColumns = '';
        grid.classList.remove('product-list-view');

        gridBtn.classList.add('active');
        gridBtn.setAttribute('aria-pressed', 'true');
        listBtn.classList.remove('active');
        listBtn.setAttribute('aria-pressed', 'false');

        localStorage.setItem('djangomart_view_pref', 'grid');
    }
}

// Check saved view preference on load
document.addEventListener('DOMContentLoaded', () => {
    const savedView = localStorage.getItem('djangomart_view_pref');
    if (savedView === 'list') {
        setView('list');
    }

    // Load products from API if grid exists and is empty
    const apiGrid = document.getElementById('api-products-grid') || document.getElementById('product-grid');
    if (apiGrid && apiGrid.querySelector('.empty-state .fa-spinner')) {
        loadProductsFromAPI(apiGrid);
    }
});


/* ─────────────────────────────────────────────
   Fetch products from DRF API and render them
───────────────────────────────────────────── */
async function loadProductsFromAPI(container) {
    try {
        const response = await fetch('/api/v1/products/products/');
        if (!response.ok) throw new Error('API fetch failed');
        
        const data = await response.json();
        const products = data.results || data; // Handle paginated or list response
        
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open empty-icon" aria-hidden="true"></i>
                    <h3>No products found</h3>
                    <p>There are currently no products available from the API.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = ''; // Clear loading spinner
        
        products.forEach(product => {
            const price       = product.price || '0.00';
            const name        = product.name || 'Unnamed Product';
            const category    = product.category_name || product.category || 'Uncategorized';
            const imageUrl    = product.image || '/static/images/product_placeholder.png';
            const rating      = product.average_rating || 0;
            const reviewCount = product.review_count || 0;
            
            // Build stars
            let starsHtml = '';
            for(let i = 1; i <= 5; i++) {
                starsHtml += `<i class="fas fa-star ${i <= rating ? 'filled' : ''}" aria-hidden="true"></i>`;
            }

            const oldPrice = product.old_price
                ? `<span class="price-original">$${product.old_price}</span>`
                : '';
            
            const card = document.createElement('div');
            card.className = 'card product-card';
            card.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${name}" loading="lazy" onerror="this.src='/static/images/product_placeholder.png'">
                    <div class="product-actions">
                        <button class="icon-btn" title="Add to Wishlist"><i class="fas fa-heart"></i></button>
                        <a href="/products/${product.id}/" class="icon-btn" title="Quick View"><i class="fas fa-eye"></i></a>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category">${category}</span>
                    <a href="/products/${product.id}/" class="product-title">${name}</a>
                    <div class="product-rating">
                        <span class="stars">${starsHtml}</span>
                        <span class="rating-count">(${reviewCount})</span>
                    </div>
                    <div class="product-price">
                        <div>${oldPrice}<span class="price-current">$${price}</span></div>
                        <button class="icon-btn btn-cart" title="Add to Cart"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading products from API:', error);
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-triangle empty-icon" aria-hidden="true" style="color:var(--danger)"></i>
                <h3>Failed to load products</h3>
                <p>Could not connect to the API. Please try again later.</p>
            </div>
        `;
    }
}
