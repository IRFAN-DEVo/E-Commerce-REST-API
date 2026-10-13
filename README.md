# DjangoMart E-Commerce Platform

A full-stack, modular e-commerce web application featuring a **Django REST Framework** backend, PostgreSQL/SQLite database support, SimpleJWT token authentication, and a modern **React + Vite** single-page application (SPA) storefront and management dashboard.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------+
|                                CLIENT LAYER                                 |
|         React 19 + Vite SPA (Customer Storefront & Admin Dashboard)         |
|         - Axios API Client with automated JWT refresh interceptor           |
|         - Context API State Management (Auth, Cart, Toast)                 |
|         - Lucide React Icons & Vanilla CSS Design Tokens                    |
+-----------------------------------------------------------------------------+
                                      |
                           HTTP / REST API Requests
                                      |
+-----------------------------------------------------------------------------+
|                          REVERSE PROXY LAYER (Nginx)                        |
|   - SPA Fallback Routing: /products, /cart, /checkout, /orders/:id          |
|   - React Admin Routes: /admin/dashboard, /admin/orders, /admin/products    |
|   - Django Admin Proxy: /admin/ -> Gunicorn                                 |
|   - API Proxy: /api/ -> Gunicorn (404s return JSON, never HTML)             |
|   - Static & Media: /static/ (immutable), /media/ (CSP & MIME whitelist)   |
+-----------------------------------------------------------------------------+
                                      |
+-----------------------------------------------------------------------------+
|                             BACKEND API LAYER                               |
|                     Django 6.0 + Django REST Framework                      |
|   - Authentication: SimpleJWT (Access + Refresh with Token Blacklisting)   |
|   - Catalog: Products, Categories, Brands, Media (Images & Videos)          |
|   - Shopping Flow: Cart, Single-use / Multi-use Coupons                     |
|   - Checkout & Orders: Concurrency-safe atomic checkout (select_for_update) |
|   - Payment System: Cash on Delivery (COD) active; Razorpay & Stripe disabled|
|   - Customer Isolation: IDOR protection across orders, cart, wishlist       |
|   - OpenAPI Documentation: drf-spectacular (Swagger UI & ReDoc)             |
+-----------------------------------------------------------------------------+
                                      |
+-----------------------------------------------------------------------------+
|                              DATABASE LAYER                                 |
|   - Staging / Production: PostgreSQL 18+ (ACID Row-level locking)           |
|   - Local Development: SQLite 3                                             |
+-----------------------------------------------------------------------------+
```

---

## Current Status & Capabilities

* **Active Payment Gateway**: **Cash on Delivery (COD)** is the only active, verified payment method.
* **Disabled Gateways**: Razorpay and Stripe gateway integrations are unimplemented stubs. Incoming requests specifying `RAZORPAY` or `STRIPE` are strictly rejected by the backend with an `HTTP 400 Bad Request` validation response before any database mutations or stock deductions occur.
* **Authentication**: Email-based authentication with SimpleJWT. Logout endpoints use token blacklisting to invalidate refresh tokens.
* **Deployment Status**: Application code, OpenAPI schemas, and database concurrency handling are verified. Staging Nginx configuration is prepared in `deploy/nginx/djangomart.conf`. Live Linux staging deployment, public domain DNS, and HTTPS TLS certificates remain pending host infrastructure provisioning.

---

## Repository Structure

```
├── .env.example               # Root environment configuration template
├── .gitignore                 # Root Git exclusion rules
├── deploy/
│   └── nginx/
│       └── djangomart.conf    # Production Nginx reverse proxy configuration
├── frontend/                  # React + Vite application
│   ├── src/                   # Components, contexts, pages, API clients
│   ├── package.json           # Frontend dependencies & build scripts
│   ├── vite.config.js         # Vite bundler & dev proxy config
│   └── .env.example           # Frontend environment variable template
├── src/
│   └── commerce/              # Django backend project
│       ├── manage.py          # Django CLI
│       ├── requirements.txt   # Python dependencies (includes psycopg2 & gunicorn)
│       ├── commerce/          # Root project settings, URLs, WSGI
│       ├── accounts/          # User model, email auth backend, token blacklist
│       ├── products/          # Catalog models, filters, views, import/export
│       ├── cart/              # Persistent cart & cart items
│       ├── orders/            # Concurrency-safe checkout & status transitions
│       ├── payments/          # Payment records & method validation
│       ├── coupons/           # Coupon validation & redemption tracking
│       ├── reviews/           # Verified purchase review enforcement
│       ├── wishlist/          # User wishlist management
│       ├── notifications/     # Signal-driven customer notifications
│       └── dashboard/         # Administrative analytics & sales trends
└── fix_migrations.py          # Utility script for migration repairs
```

---

## Local Development Setup

### 1. Prerequisites
* Python 3.12+
* Node.js v20+ & npm
* PostgreSQL (recommended for concurrency testing) or SQLite 3

### 2. Backend Setup
```bash
# Navigate to backend directory
cd "src/commerce"

# Create and activate virtual environment
python -m venv ../../venv
# On Windows:
..\..\venv\Scripts\activate
# On Linux/macOS:
source ../../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and adjust values as needed
cp ../../.env.example .env

# Apply database migrations
python manage.py migrate

# (Optional) Seed initial product data or create superuser
python manage.py createsuperuser

# Start Django development server
python manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd "frontend"

# Install Node dependencies
npm install

# Start Vite development server (proxies /api/v1 to http://127.0.0.1:8000)
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Testing & Quality Assurance

### Run Backend Unit & Security Tests
```bash
cd "src/commerce"

# Run payment security & logout blacklisting tests
python manage.py test commerce.test_payment_security accounts.tests --keepdb

# Run permission & IDOR isolation tests
python manage.py test commerce.test_permissions --keepdb

# Run full backend test suite
python manage.py test --keepdb
```

### Run PostgreSQL Concurrency Tests
```bash
# Ensure PostgreSQL staging database is created and set DATABASE_URL
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/djangomart_staging
python manage.py test commerce.test_stage5_postgresql_e2e_concurrency --keepdb -v 2
```

### Run Frontend Tests
```bash
cd "frontend"
npm test
```

### Production Build Verification
```bash
cd "frontend"
npm run build
```

### Django Deployment Check & OpenAPI Schema Validation
```bash
cd "src/commerce"
python manage.py check --deploy
python manage.py spectacular --validate
```
