# DGD Logistics Platform

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
docker compose exec backend python manage.py seed_landing
```
Demo accounts: `admin@transport.com` / `admin123`, `customer@example.com` / `customer123`

### Frontend dev (standalone)
```bash
cd frontend && npm install && npm start
```
Proxies API to `http://localhost:80` via `package.json` proxy field.

### Backend dev (standalone)
```bash
cd backend && pip install -r requirements.txt
python manage.py migrate && python manage.py runserver
```

## Project Structure
```
backend/
  config/            # Django settings, URLs, WSGI
  accounts/          # Custom User model (email-based), auth, admin user mgmt, analytics
  orders/            # Order, OrderImage, OrderStatusHistory — full order lifecycle
  categories/        # TransportCategory model, keyword-based suggestion engine
  vehicles/          # Vehicle fleet management
  landing/           # Landing page CMS (singleton model, multilingual JSON fields)
frontend/src/
  api/client.js      # Axios with JWT interceptor + auto token refresh
  contexts/          # AuthContext, ThemeContext, LanguageContext
  components/
    layouts/         # PublicLayout, AppLayout, AdminLayout, DashboardLayout
    common/          # ProtectedRoute, StatusBadge, LocationAutocomplete
    map/             # MapPicker (React-Leaflet)
  pages/public/      # LandingPage, LoginPage, RegisterPage
  pages/app/         # Customer: AppHome, NewOrderFlow, Orders, OrderDetail, Profile
  pages/admin/       # Admin: Dashboard, Orders, OrderDetail, Users, Categories, Vehicles, Analytics, Landing
  pages/dashboard/   # Legacy — redirects to /app
  i18n/              # translations.js (EN, KA, RU — ~1500 keys each)
  utils/             # status.js (STATUS_CONFIG, URGENCY_CONFIG), categoryIcons.js
nginx/               # Reverse proxy config (nginx.conf, Dockerfile)
```

## API Endpoints
All under `/api/`:
- **Auth**: `/auth/register/`, `/auth/login/`, `/auth/token/refresh/`, `/auth/logout/`, `/auth/profile/`, `/auth/profile/change-password/`, `/auth/profile/stats/`
- **Admin Users**: `/auth/admin/users/`, `/auth/admin/users/create/`, `/auth/admin/users/<id>/`, `/auth/admin/dashboard/`, `/auth/admin/analytics/`
- **Categories**: `/categories/` (public), `/categories/suggest/`, `/categories/admin/`, `/categories/admin/<id>/`
- **Orders (customer)**: `/orders/`, `/orders/active/`, `/orders/create/`, `/orders/<id>/`, `/orders/<id>/cancel/`, `/orders/<id>/upload/`
- **Orders (admin)**: `/orders/admin/`, `/orders/admin/<id>/`, `/orders/admin/<id>/status/`
- **Vehicles**: `/vehicles/` (public), `/vehicles/admin/`, `/vehicles/admin/<id>/`
- **Landing**: `/landing/` (public), `/landing/admin/`

## Key Patterns

### Authentication
- JWT with access (60min) + refresh (7 days) tokens, refresh rotation with blacklisting
- Custom User model: email as USERNAME_FIELD, roles: `customer`/`admin`, types: `personal`/`company`
- Frontend Axios interceptor auto-refreshes expired tokens and retries failed requests
- Permissions: `IsAdmin`, `IsCustomer` in `accounts/permissions.py`

### Order Status Flow
```
New -> Under Review -> Approved -> In Progress -> Completed
                   \-> Rejected
Cancel allowed from: New, Under Review only
```
Status changes tracked in `OrderStatusHistory` with changed_by user and comment.

### Backend Conventions
- Class-based views using DRF generics (ListAPIView, CreateAPIView, RetrieveUpdateDestroyAPIView, etc.)
- Serializers handle validation, nested representation, and field-level permissions
- Pagination: PageNumberPagination (page_size=20) — global default
- Filtering/search/ordering via django-filter backends on list views
- Image uploads use multipart form data with date-based storage paths
- Singleton pattern for LandingPageSettings (always pk=1)
- Multilingual content stored as JSONField dictionaries `{en: "...", ka: "...", ru: "..."}`

### Frontend Conventions
- Functional components with hooks — no class components
- Context API for global state: AuthContext, ThemeContext, LanguageContext
- Ant Design 5 components with custom theme tokens (primary: #00B856)
- CSS variables in `theme.css` for light/dark mode (data-theme attribute on root)
- Inline styles referencing CSS variables (e.g., `background: 'var(--bg-secondary)'`)
- `useLang()` hook returns `t(key, params)` for translations — nested dot notation keys
- Route guards: `ProtectedRoute` (role check), `AppAuthGuard` (auth + admin redirect)
- Mobile-first responsive: Ant Design `useBreakpoint()` with `screens.md` check
- Layouts: bottom tab bar on mobile, horizontal nav on desktop

### i18n Pattern
- Three languages: English (en), Georgian (ka), Russian (ru)
- Translation keys: nested object with dot notation access — `t('orders.myOrders')`
- Supports interpolation: `t('home.viewAllActive', { count: 5 })`
- Falls back to English if key missing in current language
- Backend multilingual fields: JSONField with `{en, ka, ru}` keys (landing page content)

## Environment Variables
Configured in `.env` at project root:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- `CORS_ALLOW_ALL_ORIGINS`, `CORS_ALLOWED_ORIGINS`
- `REACT_APP_API_URL` — API base URL (default: `/api`)

## Database Migrations
```bash
# Create new migrations
docker compose exec backend python manage.py makemigrations

# Apply migrations
docker compose exec backend python manage.py migrate
```
Current state: accounts(3), categories(3), orders(3), vehicles(1), landing(2)

## Docker Services
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| db | postgres:16-alpine | 5432 | Database with health checks |
| backend | python:3.11-slim | 8000 | Django + Gunicorn (3 workers) |
| frontend | node:18-alpine | — | Build-only, outputs to shared volume |
| nginx | nginx:1.25-alpine | 80 | Reverse proxy, serves SPA + static/media |

Startup order: db (healthy) -> backend (migrate + collectstatic + gunicorn) -> frontend (build) -> nginx

## Common Tasks

### Add a new Django app
```bash
cd backend && python manage.py startapp <name>
```
1. Register in `config/settings.py` INSTALLED_APPS
2. Add URLs in `config/urls.py`: `path('api/<name>/', include('<name>.urls'))`
3. Create models, serializers, views, urls in the app

### Add a new API endpoint
1. Define model in `<app>/models.py`
2. Create serializer in `<app>/serializers.py`
3. Create view in `<app>/views.py` (use DRF generics)
4. Wire URL in `<app>/urls.py`
5. Include in `config/urls.py` if new app

### Add a new frontend page
1. Create page component in `frontend/src/pages/<section>/`
2. Add route in `App.js` within the appropriate layout group
3. Add translation keys to `frontend/src/i18n/translations.js` (all 3 languages)
4. Add nav link in the relevant layout component if needed

### Add translation keys
Add to all three language objects in `frontend/src/i18n/translations.js`:
- `en` (English) — primary, always add first
- `ka` (Georgian)
- `ru` (Russian)

### Rebuild after changes
```bash
docker compose up --build
```

## Testing
No formal test suite yet. Use seed data for manual QA:
```bash
docker compose exec backend python manage.py seed_data
docker compose exec backend python manage.py seed_landing
```
