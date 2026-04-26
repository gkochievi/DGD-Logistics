# DGD Logistics Platform

## Project Overview
A full-stack web platform for ordering specialized transport services (tow trucks, cranes, concrete mixers, etc.). Customers create transport orders, admins review, price, assign vehicles + drivers, and track them through completion. Three-language UI (English / Georgian / Russian).

## Architecture
- **Frontend**: React 18 SPA with Ant Design 5 UI, served via Nginx (local) or DigitalOcean static sites (prod)
- **Backend**: Django 4.2 + Django REST Framework with JWT auth
- **Database**: PostgreSQL 16
- **Proxy**: Nginx reverse proxy (local only — `/api/*` → Django, `/*` → React build)
- **Local dev**: Docker Compose with 4 services (db, backend, frontend, nginx)
- **Production target**: DigitalOcean App Platform (`.do/app.yaml`) + DO Managed Postgres + DO Spaces (S3-compatible) for media

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Ant Design 5, Axios, React Router 6, Leaflet maps, Recharts |
| Backend | Django 4.2, DRF 3.15, SimpleJWT, django-filter, Pillow, django-storages, boto3 |
| Database | PostgreSQL 16 |
| Server | Gunicorn (3 workers), Nginx 1.25 |
| Containerization | Docker, Docker Compose |
| Cloud | DigitalOcean App Platform (Apps + Managed PG + Spaces) |

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
  config/            # Django settings, URLs, WSGI, media_utils
  accounts/          # Custom User (email-based), CompanyContract, auth, admin user mgmt, analytics
  orders/            # Order, OrderImage, OrderStatusHistory, OrderEditHistory, assignment.py
  categories/        # TransportCategory (legacy car categories) + keyword suggestion engine
  services/          # Service (customer-facing taxonomy) + suggestion engine, M2M to categories
  vehicles/          # Vehicle, VehicleImage, license categories, M2M to drivers
  drivers/           # Driver, license categories, status (active/on_leave/inactive)
  landing/           # LandingPageSettings (singleton), multilingual JSON fields
  site_settings/     # SiteSettings + RestrictedTimeWindow (per-city time blocks)
frontend/src/
  api/client.js      # Axios with JWT interceptor + auto refresh
  contexts/          # AuthContext, ThemeContext, LanguageContext, BrandingContext, NotificationContext
  components/
    layouts/         # PublicLayout, AppLayout, AdminLayout
    common/          # ProtectedRoute, AppAuthGuard, ForcePasswordChangeGuard, StatusBadge, LocationAutocomplete
    map/             # MapPicker (React-Leaflet)
  pages/public/      # LandingPage, LoginPage, RegisterPage
  pages/app/         # Customer: AppHome, NewOrderFlow, AppOrdersPage, AppOrderDetailPage, AppProfilePage, AppLoginPage, AppRegisterPage
  pages/admin/       # Admin: Dashboard, Orders, OrderDetail, Users, UserForm, Categories, Services, Vehicles, Drivers, Analytics, Landing, Settings
  i18n/              # translations.js (EN, KA, RU)
  utils/             # status.js (STATUS_CONFIG, URGENCY_CONFIG), categoryIcons.js
nginx/               # Local-only reverse proxy (nginx.conf, Dockerfile)
.do/                 # app.yaml — DigitalOcean App Platform spec
.claude/             # Subagents (.claude/agents/*.md) and project-local settings
```

## API Endpoints
All under `/api/`:
- **Auth**: `/auth/register/`, `/auth/login/`, `/auth/token/refresh/`, `/auth/logout/`, `/auth/profile/`, `/auth/profile/change-password/`, `/auth/profile/stats/`, `/auth/profile/contracts/`
- **Admin Users**: `/auth/admin/users/`, `/auth/admin/users/create/`, `/auth/admin/users/<id>/`, `/auth/admin/users/<id>/reset-password/`, `/auth/admin/users/<id>/contracts/`, `/auth/admin/users/<id>/contracts/<contract_id>/`, `/auth/admin/dashboard/`, `/auth/admin/analytics/`
- **Categories**: `/categories/` (public), `/categories/suggest/`, `/categories/admin/`, `/categories/admin/<id>/`
- **Services**: `/services/` (public), `/services/suggest/`, `/services/admin/`, `/services/admin/<id>/`
- **Orders (customer)**: `/orders/`, `/orders/active/`, `/orders/notifications/`, `/orders/notifications/mark-read/`, `/orders/create/`, `/orders/<id>/`, `/orders/<id>/cancel/`, `/orders/<id>/accept/`, `/orders/<id>/upload/`
- **Orders (admin)**: `/orders/admin/`, `/orders/admin/export/`, `/orders/admin/notifications/`, `/orders/admin/notifications/mark-read/`, `/orders/admin/<id>/`, `/orders/admin/<id>/export/`, `/orders/admin/<id>/status/`
- **Vehicles**: `/vehicles/` (public), `/vehicles/admin/`, `/vehicles/admin/<id>/`, `/vehicles/admin/<id>/images/`
- **Drivers**: `/drivers/admin/`, `/drivers/admin/<id>/`
- **Landing**: `/landing/` (public), `/landing/admin/`
- **Site settings**: `/site-settings/` (public), `/site-settings/admin/`, `/site-settings/admin/time-windows/`, `/site-settings/admin/time-windows/<id>/`

## Key Patterns

### Authentication
- JWT with access (60min) + refresh (7 days), refresh rotation with blacklist
- Custom User model: `email` as `USERNAME_FIELD`; roles: `customer` / `admin`; user types: `personal` / `company`
- `must_change_password` flag forces a password reset flow after admin reset
- Frontend Axios interceptor auto-refreshes expired tokens and retries
- Permissions: `IsAdmin`, `IsCustomer` in `accounts/permissions.py`

### Order Status Flow
```
new -> under_review -> offer_sent -> approved -> in_progress -> completed
                    \-> rejected (terminal)
new / under_review / offer_sent -> cancelled (customer-initiated only)
```
- `offer_sent` requires a `price`. The customer accepts via `/orders/<id>/accept/` to move into `approved`.
- `approved` means the customer has committed (resource is locked).
- Backward moves along the progression are blocked. `cancelled`/`rejected`/`completed` are terminal.
- Status changes are tracked in `OrderStatusHistory`; per-field admin edits to customer fields go to `OrderEditHistory`.

### Backend Conventions
- Class-based views using DRF generics (`ListAPIView`, `CreateAPIView`, `RetrieveUpdateDestroyAPIView`, …)
- Serializers handle validation, nested representation, field-level permissions
- Pagination: `PageNumberPagination` (page_size=20) — global default
- Filtering / search / ordering via django-filter + DRF `SearchFilter` / `OrderingFilter`
- Image uploads use multipart form data; filenames replaced with UUIDs by `config/media_utils.py`
- File cleanup signals delete old/replaced files via `register_file_cleanup`
- Singleton pattern for `LandingPageSettings` and `SiteSettings` (always pk=1)
- Multilingual content stored as `JSONField` dicts `{en: "...", ka: "...", ru: "..."}`

### Frontend Conventions
- Functional components with hooks — no class components
- Context API for global state: `AuthContext`, `ThemeContext`, `LanguageContext`, `BrandingContext`, `NotificationContext`
- Ant Design 5 components with custom theme tokens (primary `#00B856`)
- CSS variables in `theme.css` for light/dark mode (`data-theme` attribute on root)
- Inline styles referencing CSS variables (e.g. `background: 'var(--bg-secondary)'`)
- `useLang()` returns `t(key, params)` for translations — nested dot notation
- Route guards: `ProtectedRoute` (role check), `AppAuthGuard` (auth + admin redirect), `ForcePasswordChangeGuard`
- Mobile-first: Ant Design `Grid.useBreakpoint()` with `screens.md` check
- Layouts: bottom tab bar on mobile, horizontal nav on desktop

### i18n Pattern
- Three languages: English (`en`), Georgian (`ka`), Russian (`ru`)
- Keys: nested objects with dot notation — `t('orders.myOrders')`
- Interpolation: `t('home.viewAllActive', { count: 5 })`
- Falls back to English if the key is missing in the active language
- Backend multilingual fields use `JSONField` with `{en, ka, ru}` keys (landing page, services, categories)

## Environment Variables
Configured in `.env` at the project root for local dev (template in `.env.example`):
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_SSLMODE`
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- `CORS_ALLOW_ALL_ORIGINS`, `CORS_ALLOWED_ORIGINS`
- `REACT_APP_API_URL`, `REACT_APP_NOTIFICATION_POLL_MS`
- `USE_SPACES` + `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME`, `AWS_S3_ENDPOINT_URL`, `AWS_S3_CUSTOM_DOMAIN`, `AWS_LOCATION_STATIC`, `AWS_LOCATION_MEDIA`

For DigitalOcean prod: see `.do/app.yaml` (binds `${db.*}` from the managed Postgres component) and `env.digitalocean.txt` for the variable map.

## Database Migrations
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

## Docker Services (local only)
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| db | postgres:16-alpine | 5432 | DB with health checks |
| backend | python:3.11-slim | 8000 | Django + Gunicorn (3 workers) |
| frontend | node:18-alpine | — | Build-only, outputs to shared volume |
| nginx | nginx:1.25-alpine | 80 | Reverse proxy, serves SPA + static/media |

Startup order: db (healthy) → backend (migrate + collectstatic + gunicorn) → frontend (build) → nginx.

## Common Tasks

### Add a new Django app
```bash
cd backend && python manage.py startapp <name>
```
1. Register in `config/settings.py` `INSTALLED_APPS`
2. Add URLs in `config/urls.py`: `path('api/<name>/', include('<name>.urls'))`
3. Create models, serializers, views, urls in the app

### Add a new API endpoint
1. Define model in `<app>/models.py`
2. Create serializer in `<app>/serializers.py`
3. Create view in `<app>/views.py` (DRF generics)
4. Wire URL in `<app>/urls.py`
5. Include in `config/urls.py` if a new app
> Use the **`new-api-endpoint`** subagent for end-to-end DRF endpoint creation.

### Add a new frontend page
1. Create page in `frontend/src/pages/<section>/`
2. Add route in `App.js` within the appropriate layout group
3. Add translation keys to `frontend/src/i18n/translations.js` (all 3 languages)
4. Add nav link in the relevant layout component if needed
> Use the **`frontend-dev`** subagent for React/Ant Design work, **`i18n-translator`** for adding translation keys.

### Rebuild after changes
```bash
docker compose up --build
```

## Testing
No formal test suite. For QA, seed data manually:
```bash
docker compose exec backend python manage.py seed_data
docker compose exec backend python manage.py seed_landing
```

## Subagents (`.claude/agents/`)
| Agent | Use for |
|-------|---------|
| `backend-dev` | Django models, serializers, views, URLs, admin |
| `frontend-dev` | React + Ant Design pages, theming, contexts |
| `full-stack-feature` | Features that span backend + frontend in one pass |
| `new-api-endpoint` | Drop-in DRF endpoint scaffolding |
| `docker-ops` | docker-compose, container debugging, logs, db shell |
| `digitalocean-deploy` | `.do/app.yaml`, Spaces, env wiring, SSL/CSRF for DO |
| `db-migrations` | Migrations: create, review, squash, fix conflicts, no-op patterns |
| `i18n-translator` | Add translation keys across en/ka/ru consistently |
| `security-audit` | Spot CSRF/CORS, JWT, file upload, CSV-injection, leak risks |

Invoke with `Agent({ subagent_type: "<name>", … })`. Each agent has a focused system prompt — pass concrete file paths and goals.

## Plugins (installed via `/plugin`)
Available skills/commands the platform's plugins expose:
- **`code-review`** — `/code-review` for PR-style review of changes.
- **`frontend-design`** — `frontend-design:frontend-design` skill for distinctive, production-grade React UI work (use on landing page, public pages, customer-facing flows).
- **`searchfit-seo`** — relevant for the public-facing parts (landing, services). Useful: `searchfit-seo:on-page-seo`, `searchfit-seo:schema-markup`, `searchfit-seo:technical-seo`, `searchfit-seo:translate-content` for the multilingual landing copy.
- **`superpowers`** — workflow skills (`brainstorming`, `writing-plans`, `executing-plans`, `verification-before-completion`, `using-git-worktrees`, `subagent-driven-development`, `test-driven-development`, `requesting-code-review`).
- **`context7`** — pulls library documentation when working with Django/DRF/Ant Design/Leaflet APIs.

Prefer plugin skills over ad-hoc work when they apply (e.g. before any new public-page UI: run `frontend-design:frontend-design`; before implementing a multi-step task: `superpowers:writing-plans`; before claiming work is done: `superpowers:verification-before-completion`).

## Deployment

### DigitalOcean App Platform (target)
Spec lives in `.do/app.yaml`. Pre-launch checklist:
1. Set `services[].github.repo` and `branch` to the real repo.
2. Set `DJANGO_SECRET_KEY` via the App Platform dashboard (don't commit it).
3. Decide: `USE_SPACES=True` (recommended) **or** add WhiteNoise to serve static files from the backend container — currently neither is wired and Django will not serve `/staticfiles/` or `/media/` in production by default.
4. Add to `backend/config/settings.py`:
   - `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` (DO LB terminates TLS)
   - `CSRF_TRUSTED_ORIGINS` driven from env (currently hardcoded to ngrok)
   - `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` for prod
5. Move `migrate` + `collectstatic` to a `pre_deploy` job rather than `run_command` to avoid race + boot-loop on multi-instance deploys.

> Use the **`digitalocean-deploy`** subagent for any DO-specific change.

## House rules for AI work
- Don't add new packages without checking they fit existing layers (DRF generics, Ant Design 5, Leaflet, Recharts).
- Always add translation keys to **all three** language objects in `frontend/src/i18n/translations.js`.
- For customer-facing endpoints, filter by `request.user` in `get_queryset()`. Don't trust query params.
- New file uploads must use the helpers in `backend/config/media_utils.py` (UUID rename, allowed-ext check, signal-driven cleanup).
- For multilingual model fields, use `JSONField` with `{en, ka, ru}` and let serializers pass them through unchanged.
- Verify changes by hitting the actual flow in the browser before declaring done — type-checks/test-suite alone don't catch UI regressions.
