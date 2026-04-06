# Special Transport Order Platform

A production-ready, mobile-first MVP platform for ordering special transport services. Users can register, create transport requests, track order history, and manage their profile. Admins manage orders, users, and transport categories through a dedicated dashboard.

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Backend        | Django 4.2 + Django REST Framework  |
| Database       | PostgreSQL 15                       |
| Frontend       | React 18 + Ant Design 5            |
| Auth           | JWT (SimpleJWT)                     |
| Containerization | Docker + Docker Compose           |
| Reverse Proxy  | Nginx                               |

## Quick Start

### 1. Clone and configure

```bash
cd Special-transport-order
cp .env.example .env
# Edit .env if needed (defaults work for development)
```

### 2. Build and start all services

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **Django backend** (internal port 8000)
- **React frontend** (built and served by Nginx)
- **Nginx** reverse proxy on port 80

### 3. Run database migrations

Migrations run automatically on startup. To run manually:

```bash
docker-compose exec backend python manage.py migrate
```

### 4. Load seed/demo data

```bash
docker-compose exec backend python manage.py seed_data
```

This creates:
- **Admin user:** `admin@transport.com` / `admin123`
- **Customer user:** `customer@demo.com` / `customer123`
- **Customer user 2:** `jane@demo.com` / `customer123`
- 4 transport categories with suggestion keywords
- 5 sample orders across different statuses

### 5. Access the platform

| URL                         | Description          |
|-----------------------------|----------------------|
| http://localhost             | Landing page         |
| http://localhost/login       | Login                |
| http://localhost/register    | Registration         |
| http://localhost/dashboard   | Customer dashboard   |
| http://localhost/admin       | Admin dashboard      |
| http://localhost/admin/      | Django admin (staff)  |

## Environment Variables

| Variable                          | Default                   | Description               |
|-----------------------------------|---------------------------|---------------------------|
| `POSTGRES_DB`                     | `transport_db`            | Database name             |
| `POSTGRES_USER`                   | `transport_user`          | Database user             |
| `POSTGRES_PASSWORD`               | `transport_secret_password` | Database password       |
| `DJANGO_SECRET_KEY`               | `dev-secret-key...`       | Django secret key         |
| `DJANGO_DEBUG`                    | `True`                    | Debug mode                |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `60`                    | Access token TTL          |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `7`                       | Refresh token TTL         |
| `REACT_APP_API_URL`               | `http://localhost/api`    | Frontend API base URL     |

## Project Structure

```
├── docker-compose.yml
├── .env / .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/          # Django settings, URLs, WSGI
│   ├── accounts/        # User model, auth, profile, admin user mgmt
│   ├── categories/      # Transport categories, suggestion engine
│   └── orders/          # Orders, images, status history
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── api/         # Axios client with JWT refresh
│       ├── contexts/    # Auth context provider
│       ├── components/  # Layouts, shared components
│       ├── pages/       # Public, dashboard, admin pages
│       └── utils/       # Status config, helpers
└── nginx/
    ├── Dockerfile
    └── nginx.conf
```

## API Endpoints

### Authentication
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| POST   | `/api/auth/register/`         | User registration     |
| POST   | `/api/auth/login/`            | Login (returns JWT)   |
| POST   | `/api/auth/token/refresh/`    | Refresh access token  |
| POST   | `/api/auth/logout/`           | Logout (blacklist)    |
| GET/PATCH | `/api/auth/profile/`       | View/update profile   |
| POST   | `/api/auth/profile/change-password/` | Change password |
| GET    | `/api/auth/profile/stats/`    | Order statistics      |

### Categories
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| GET    | `/api/categories/`            | List active (public)  |
| POST   | `/api/categories/suggest/`    | Suggest from text     |
| GET/POST | `/api/categories/admin/`    | Admin list/create     |
| GET/PATCH/DELETE | `/api/categories/admin/:id/` | Admin detail  |

### Orders (Customer)
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| GET    | `/api/orders/`                | My orders             |
| GET    | `/api/orders/active/`         | My active orders      |
| POST   | `/api/orders/create/`         | Create order          |
| GET    | `/api/orders/:id/`            | Order detail          |
| POST   | `/api/orders/:id/cancel/`     | Cancel order          |
| POST   | `/api/orders/:id/upload/`     | Upload images         |

### Orders (Admin)
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| GET    | `/api/orders/admin/`          | All orders (filtered) |
| GET/PATCH | `/api/orders/admin/:id/`   | Order detail/update   |
| POST   | `/api/orders/admin/:id/status/` | Change status       |

### Users (Admin)
| Method | Endpoint                      | Description           |
|--------|-------------------------------|-----------------------|
| GET    | `/api/auth/admin/users/`      | List users            |
| POST   | `/api/auth/admin/users/create/` | Create user         |
| GET/PATCH | `/api/auth/admin/users/:id/` | User detail/update  |
| GET    | `/api/auth/admin/dashboard/`  | Admin stats           |

## Common Commands

```bash
# Start services
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Load seed data
docker-compose exec backend python manage.py seed_data

# Open Django shell
docker-compose exec backend python manage.py shell

# Reset database
docker-compose down -v
docker-compose up --build
```

## User Roles

| Role     | Access                                            |
|----------|--------------------------------------------------|
| Customer | Dashboard, create/view/cancel orders, profile     |
| Admin    | All orders, user management, categories, stats    |

## Order Status Flow

```
New → Under Review → Approved → In Progress → Completed
                   → Rejected
New / Under Review → Cancelled (by customer)
```

## Transport Suggestion Engine

The backend includes a keyword-based suggestion system. Each transport category stores comma-separated keywords. When a user types a job description, the system scores each category by keyword matches and returns the best fit.

Keywords are fully configurable through the admin category management interface.

## Future Extension Notes

- **Payment integration**: Add Stripe/PayPal for order payments
- **Real-time notifications**: WebSocket-based status updates
- **GPS tracking**: Live vehicle tracking with map integration
- **Driver/operator app**: Separate interface for transport operators
- **Rating system**: Post-completion reviews and ratings
- **File management**: S3/cloud storage for production media
- **Email notifications**: Order confirmations and status change alerts
- **Advanced search**: Elasticsearch for full-text order search
- **Multi-language**: i18n support for internationalization
- **Pricing engine**: Configurable pricing by category, distance, urgency
