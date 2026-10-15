DjangoMart — E-Commerce Platform

A modern, full-stack e-commerce platform built with Django REST Framework, React, and Vite. DjangoMart provides a responsive shopping experience, JWT-based authentication, product catalog management, cart and checkout functionality, order processing, and an administrative dashboard.

The application follows a modular architecture, supports PostgreSQL and SQLite, and uses a minimalist black-and-white interface designed for a clean, consistent shopping experience.

✨ Features

🛍️ Customer Storefront

Modern React UI — Responsive storefront with a minimalist black-and-white design.

Product Catalog — Browse products with search, filtering, sorting, and pagination.

Product Details — View product information, pricing, availability, and reviews.

Shopping Cart — Add products, update quantities, and remove items.

Wishlist — Save products for later.

Checkout — Complete purchases using the supported payment method.

Order Management — View orders and track their status.

Customer Account — Manage account information and access order history.

Coupons — Validate eligible promotional codes during checkout.

🔐 Authentication & Security

Email-based authentication.

JWT access and refresh tokens using SimpleJWT.

Refresh-token blacklisting for logout.

Customer-specific data isolation and IDOR protections.

Server-side validation of payment methods.

Atomic checkout operations with database locking where supported.

Environment-based configuration for sensitive settings.

🛠️ Administration

Dedicated React administration dashboard.

Product inventory management.

Order and customer management.

Category and brand management.

Coupon administration.

Sales analytics and dashboard metrics.

Django's built-in administration interface for backend management.

💳 Payments

Cash on Delivery (COD): The only currently active and verified payment method.

Razorpay and Stripe: Integrations are not implemented and remain disabled. Requests using these payment methods are rejected with an HTTP 400 response before database mutations or stock deductions occur.

📚 API & Developer Tools

Django REST Framework API.

OpenAPI schema generation using drf-spectacular.

Swagger UI and ReDoc documentation.

Axios API client with automatic JWT refresh handling.

Frontend unit and integration tests.

Backend unit and security tests.

Production frontend builds using Vite.

Nginx reverse-proxy configuration prepared for deployment.

🧰 Technology Stack

Layer

Technologies

Frontend

React 19, Vite

Routing

React Router

API Communication

Axios

State Management

React Context API

Icons

Lucide React

Styling

CSS, custom design tokens

Backend

Python, Django 6.0, Django REST Framework

Authentication

SimpleJWT

Database

PostgreSQL 18+ / SQLite 3

API Documentation

drf-spectacular, OpenAPI

Production Server

Gunicorn

Reverse Proxy

Nginx

Testing

Django Test Framework, Vitest

🏗️ Architecture

                         ┌─────────────────────────────┐
                         │       Customer / Admin      │
                         │       React + Vite SPA      │
                         └──────────────┬──────────────┘
                                        │
                                   Axios / HTTP
                                        │
                         ┌──────────────▼──────────────┐
                         │            Nginx            │
                         │    Reverse Proxy / Routing  │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │       Django REST API       │
                         │                             │
                         │  Authentication & Accounts  │
                         │  Products & Catalog         │
                         │  Cart & Wishlist            │
                         │  Orders & Checkout          │
                         │  Payments & Coupons         │
                         │  Reviews & Notifications    │
                         │  Admin Dashboard            │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │       Database Layer        │
                         │   PostgreSQL / SQLite       │
                         └─────────────────────────────┘

Request Flow

The React application sends HTTP requests through Axios.

Nginx routes frontend requests and API requests to the appropriate application.

Django REST Framework validates requests and applies authentication and permission checks.

Business logic handles catalog operations, cart management, checkout, and order processing.

Database transactions protect critical operations such as checkout and inventory updates.

API responses are returned to the React application.

📂 Project Structure

E-Commerce-REST-API/
│
├── deploy/
│   └── nginx/
│       └── djangomart.conf
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── products/
│   │   ├── contexts/
│   │   ├── pages/
│   │   │   └── admin/
│   │   ├── services/
│   │   ├── __tests__/
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── src/
│   └── commerce/
│       ├── manage.py
│       ├── requirements.txt
│       ├── commerce/
│       ├── accounts/
│       ├── products/
│       ├── cart/
│       ├── orders/
│       ├── payments/
│       ├── coupons/
│       ├── reviews/
│       ├── wishlist/
│       ├── notifications/
│       └── dashboard/
│
├── .env.example
├── .gitignore
├── fix_migrations.py
└── README.md

Note: The structure above highlights the main application directories. Individual files and additional modules may vary.

🚀 Getting Started

Follow these steps to run DjangoMart locally.

Prerequisites

Install the following:

Python 3.12 or later.

Node.js 20 or later.

npm.

Git.

PostgreSQL for PostgreSQL-specific testing, or SQLite for local development.

1. Clone the Repository

git clone https://github.com/IRFAN-DEvO/E-Commerce-REST-API.git
cd E-Commerce-REST-API

2. Set Up the Backend

Create a Python virtual environment in the project root:

python -m venv venv

Activate it on Windows PowerShell:

.\venv\Scripts\Activate.ps1

On Linux or macOS:

source venv/bin/activate

Install the backend dependencies:

pip install -r src/commerce/requirements.txt

3. Configure Environment Variables

Copy the root environment template to the location expected by your Django settings.

For example, if your settings load the root .env file:

Windows PowerShell

Copy-Item .env.example .env

Linux or macOS

cp .env.example .env

Update the environment variables according to your local configuration.

Review the settings for:

Django secret key.

Debug mode.

Allowed hosts.

Database connection.

Email configuration.

Frontend/API settings where applicable.

Security: Do not commit .env files, production credentials, secret keys, or database files containing private information.

4. Run Database Migrations

cd src/commerce
python manage.py migrate

Create an administrator account:

python manage.py createsuperuser

5. Start the Backend Server

From src/commerce:

python manage.py runserver 127.0.0.1:8000

The backend API will be available at:

http://127.0.0.1:8000/

The exact API and documentation paths depend on the configured Django URL routes.

6. Set Up the Frontend

Open another terminal and navigate to the frontend directory:

cd frontend
npm install

Configure the frontend environment using the provided template:

# Windows PowerShell
Copy-Item .env.example .env

# Linux or macOS
cp .env.example .env

Ensure the API base URL matches the backend and Vite proxy configuration.

Start the development server:

npm run dev

Open the local URL printed by Vite in the terminal. If your Vite configuration uses port 3000, the application will be available at:

http://localhost:3000

Important: The frontend and backend must both be running for API-backed features to work.

🧪 Testing

DjangoMart includes backend tests for application behavior and security, as well as frontend tests for major shopping workflows.

Backend Tests

Navigate to the backend directory:

cd src/commerce

Run the complete Django test suite:

python manage.py test --keepdb

Run payment security and authentication tests:

python manage.py test commerce.test_payment_security accounts.tests --keepdb

Run permission and data-isolation tests:

python manage.py test commerce.test_permissions --keepdb

PostgreSQL Concurrency Tests

Some concurrency tests require PostgreSQL because SQLite does not provide the same row-level locking behavior.

Configure DATABASE_URL for a test PostgreSQL database before running:

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/djangomart_staging"
python manage.py test commerce.test_stage5_postgresql_e2e_concurrency --keepdb -v 2

Use appropriate local credentials and ensure the database exists before running the tests.

Frontend Tests

From the frontend directory:

npm test

Production Build

npm run build

Django Deployment Checks

From src/commerce:

python manage.py check --deploy

OpenAPI Schema Validation

python manage.py spectacular --validate

🔒 Security Considerations

Security-sensitive operations are handled on the backend rather than relying on frontend behavior.

The project includes:

JWT authentication and refresh-token blacklisting.

Request validation and permission checks.

User-specific access controls for protected resources.

Payment-method validation.

Transactional checkout and inventory operations.

Environment-based application configuration.

API schema validation and automated testing.

For production deployment, configure secure secrets, HTTPS, trusted hosts, database credentials, email delivery, and appropriate static/media storage.

🚢 Deployment Status

The project includes an Nginx configuration intended to support the React frontend, Django API, Django administration interface, and static/media resources.

Deployment is not yet complete. According to the current project status:

Nginx configuration is prepared.

Live Linux staging deployment is pending.

Public domain and DNS configuration are pending.

HTTPS/TLS certificates are pending host infrastructure provisioning.

Production email and infrastructure configuration must be completed before launch.

The application should not be described as production-deployed until the deployment has been completed and verified.

🗺️ Future Improvements

Potential future improvements include:

Implementing and testing Razorpay or Stripe payment integration.

Completing staging deployment and production infrastructure configuration.

Adding automated CI checks for backend tests, frontend tests, and builds.

Expanding integration and end-to-end testing.

Improving observability, error reporting, and operational monitoring.

👨‍💻 Author

Mohammed Irfan K.

Python / Django Backend & React Developer

GitHub: IRFAN-DEvO
