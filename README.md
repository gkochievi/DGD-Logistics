# DGD Logistics Platform

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
cd DGD-Logistics
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
| `USE_SPACES`                      | `False`                   | Toggle DigitalOcean Spaces (S3) for media + static |
| `AWS_ACCESS_KEY_ID`               | —                         | Spaces access key (when `USE_SPACES=True`) |
| `AWS_SECRET_ACCESS_KEY`           | —                         | Spaces secret key |
| `AWS_STORAGE_BUCKET_NAME`         | —                         | Spaces bucket name |
| `AWS_S3_REGION_NAME`              | `nyc3`                    | Spaces region slug (e.g. `nyc3`, `ams3`, `fra1`) |
| `AWS_S3_ENDPOINT_URL`             | `https://<region>.digitaloceanspaces.com` | Override only for non-DO S3 endpoints |
| `AWS_S3_CUSTOM_DOMAIN`            | —                         | Optional CDN/CNAME host (e.g. `<bucket>.<region>.cdn.digitaloceanspaces.com`) |
| `AWS_LOCATION_STATIC`             | `static`                  | Path prefix for static files in the bucket |
| `AWS_LOCATION_MEDIA`              | `media`                   | Path prefix for uploaded media in the bucket |

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

## DigitalOcean Spaces (Production Media + Static)

For production on DigitalOcean, offload media and static files to a Space (S3-compatible object storage):

1. **Create a Space** in the DO control panel and generate an access key + secret under **API → Spaces Keys**.
2. **Configure env vars** in `.env`:
   ```
   USE_SPACES=True
   AWS_ACCESS_KEY_ID=DO00...
   AWS_SECRET_ACCESS_KEY=...
   AWS_STORAGE_BUCKET_NAME=dgd-logistics
   AWS_S3_REGION_NAME=fra1
   # Optional: front the bucket with the DO CDN
   AWS_S3_CUSTOM_DOMAIN=dgd-logistics.fra1.cdn.digitaloceanspaces.com
   ```
3. **Run collectstatic** on deploy (already wired into the backend container):
   ```bash
   docker compose exec backend python manage.py collectstatic --noinput
   ```
4. **Bucket file listing** must be set to **Restricted** while individual files are uploaded with `public-read` ACL — django-storages handles this automatically.
5. When `USE_SPACES=True`, Nginx no longer needs to serve `/media/` or `/staticfiles/`; URLs point straight at the Space (or its CDN).

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
- **File management**: DigitalOcean Spaces / S3 cloud storage is supported via `USE_SPACES=True` (see env vars above)
- **Email notifications**: Order confirmations and status change alerts
- **Advanced search**: Elasticsearch for full-text order search
- **Multi-language**: i18n support for internationalization
- **Pricing engine**: Configurable pricing by category, distance, urgency
