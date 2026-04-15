# Special Transport Order Platform

## Project Overview
A full-stack web platform for ordering special transport services (tow trucks, cranes, concrete mixers, etc.). Customers create transport orders, admins review/manage them and assign vehicles.

## Architecture
- **Frontend**: React 18 SPA with Ant Design UI, served via Nginx
- **Backend**: Django 4.2 + Django REST Framework API with JWT auth
- **Database**: PostgreSQL 16
- **Proxy**: Nginx reverse proxy (routes `/api/*` to Django, `/*` to React)
- **Deployment**: Docker Compose orchestrating 4 services (db, backend, frontend, nginx)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Ant Design 5, Axios, React Router 6, Leaflet maps, Recharts |
| Backend | Django 4.2, DRF 3.15, SimpleJWT, django-filter, Pillow |
| Database | PostgreSQL 16 |
| Server | Gunicorn (3 workers), Nginx 1.25 |
| Containerization | Docker, Docker Compose |

## Getting Started

### Run with Docker (recommended)
```bash
docker compose up --build
```
App available at http://localhost

### Seed demo data
```bash
docker compose exec backend python manage.py seed_data
```
Demo accounts: `admin@transport.com` / `admin123`, `customer@example.com` / `customer123`

### Frontend dev (standalone)
```bash
cd frontend && npm install && npm start
```

### Backend dev (standalone)
```bash
cd backend && pip install -r requirements.txt
python manage.py migrate && python manage.py runserver
```

## Project Structure
```
backend/
  config/          # Django settings, URLs, WSGI
  accounts/        # Custom User model (email-based), auth views, admin endpoints
  orders/          # Order, OrderImage, OrderStatusHistory models and views
  categories/      # TransportCategory model, keyword-based suggestion engine
  vehicles/        # Vehicle fleet management
frontend/src/
  api/client.js    # Axios with JWT interceptor + auto token refresh
  contexts/        # AuthContext, ThemeContext, LanguageContext
  components/      # Layouts (Public, App, Admin, Dashboard), common, map
  pages/public/    # Landing, Login, Register
  pages/app/       # Customer-facing: orders, profile, new order flow
  pages/admin/     # Admin: dashboard, orders, users, categories, vehicles, analytics
  pages/dashboard/ # Legacy dashboard routes
  i18n/            # Multi-language translations
nginx/             # Reverse proxy configuration
```

## API Endpoints
All under `/api/`:
- **Auth**: `/auth/register/`, `/auth/login/`, `/auth/token/refresh/`, `/auth/logout/`, `/auth/profile/`
- **Categories**: `/categories/` (public), `/categories/suggest/`, `/categories/admin/`
- **Orders (customer)**: `/orders/`, `/orders/active/`, `/orders/create/`, `/orders/<id>/cancel/`, `/orders/<id>/upload/`
- **Orders (admin)**: `/orders/admin/`, `/orders/admin/<id>/status/`
- **Users (admin)**: `/auth/admin/users/`, `/auth/admin/dashboard/`, `/auth/admin/analytics/`
- **Vehicles**: `/vehicles/` (public), `/vehicles/admin/`

## Key Patterns

### Authentication
- JWT with access (60min) + refresh (7 days) tokens, refresh rotation with blacklisting
- Custom User model: email-based, roles: `customer`/`admin`, types: `personal`/`company`
- Frontend Axios interceptor auto-refreshes expired tokens

### Order Status Flow
```
New -> Under Review -> Approved -> In Progress -> Completed
                   \-> Rejected
Cancel allowed from: New, Under Review only
```

### Backend Conventions
- Class-based views (DRF generics: ListAPIView, CreateAPIView, etc.)
- Custom permissions: `IsAdmin`, `IsCustomer` in `accounts/permissions.py`
- Pagination: PageNumberPagination (page_size=20)
- Filtering/search/ordering via django-filter backends

### Frontend Conventions
- Functional components with hooks
- Context API for global state (auth, theme, language)
- Ant Design components throughout
- Route-based page organization with layout wrappers

## Environment Variables
Configured in `.env` at project root. Key vars:
- `POSTGRES_*` - Database connection
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- `CORS_ALLOW_ALL_ORIGINS`
- `REACT_APP_API_URL` - API base URL (default: `/api`)

## Testing
No formal test suite yet. Use seed data for manual QA:
```bash
docker compose exec backend python manage.py seed_data
```

## Common Tasks

### Add a new Django app
```bash
cd backend && python manage.py startapp <name>
```
Then register in `config/settings.py` INSTALLED_APPS and add URLs in `config/urls.py`.

### Add a new API endpoint
1. Define model in `<app>/models.py`
2. Create serializer in `<app>/serializers.py`
3. Create view in `<app>/views.py`
4. Wire URL in `<app>/urls.py`
5. Include in `config/urls.py`

### Rebuild after changes
```bash
docker compose up --build
```

### Database migrations
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```
