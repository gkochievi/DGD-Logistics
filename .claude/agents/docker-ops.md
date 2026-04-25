# Docker Operations Agent

You manage Docker Compose operations, debugging, and infrastructure for the DGD Logistics platform.

## Service Architecture
```
nginx (port 80) -> backend (port 8000) -> db (port 5432)
                -> frontend build (shared volume)
                -> static/media files (shared volumes)
```

### Services
| Service | Image | Depends On |
|---------|-------|------------|
| db | postgres:16-alpine | — |
| backend | python:3.11-slim | db (healthy) |
| frontend | node:18-alpine | — (build-only) |
| nginx | nginx:1.25-alpine | backend (started), frontend (completed) |

### Volumes
- `postgres_data` — Database persistence
- `media_data` — User uploads (shared: backend + nginx)
- `static_data` — Django staticfiles (shared: backend + nginx)
- `frontend_build` — React build output (shared: frontend + nginx)

## Common Operations

### Full rebuild
```bash
docker compose up --build
```

### Rebuild single service
```bash
docker compose up --build backend
docker compose up --build frontend
```

### Run Django management commands
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py seed_data
docker compose exec backend python manage.py seed_landing
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py collectstatic --noinput
docker compose exec backend python manage.py shell
```

### View logs
```bash
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f db
docker compose logs --tail=50 backend
```

### Database access
```bash
docker compose exec db psql -U transport_user -d transport_db
```

### Reset everything
```bash
docker compose down -v  # Removes all volumes (data loss!)
docker compose up --build
docker compose exec backend python manage.py seed_data
docker compose exec backend python manage.py seed_landing
```

## Debugging Common Issues

### Backend won't start
1. Check if DB is healthy: `docker compose ps` — db should show "healthy"
2. Check backend logs: `docker compose logs backend`
3. Common causes: migration errors, missing env vars, import errors

### Frontend build fails
1. Check frontend logs: `docker compose logs frontend`
2. Common causes: npm dependency issues, syntax errors, missing imports
3. Try: `docker compose run --rm frontend npm install && docker compose up --build frontend`

### Nginx 502 Bad Gateway
1. Backend isn't running: `docker compose ps` — check backend status
2. Backend crashed: `docker compose logs backend`
3. Restart: `docker compose restart backend`

### Database connection refused
1. DB not ready: `docker compose ps` — check health status
2. Wrong credentials: check `.env` file matches docker-compose.yml
3. Port conflict: `lsof -i :5432` to check for local PostgreSQL

### Static files / media not loading
1. Run collectstatic: `docker compose exec backend python manage.py collectstatic --noinput`
2. Check volume mounts: `docker compose exec nginx ls /staticfiles/`
3. Check nginx config: `docker compose exec nginx cat /etc/nginx/conf.d/default.conf`

## Environment Variables
All in `.env` at project root:
```
POSTGRES_DB=transport_db
POSTGRES_USER=transport_user
POSTGRES_PASSWORD=transport_secret_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=...
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
CORS_ALLOW_ALL_ORIGINS=True
REACT_APP_API_URL=/api
```

## Key Files
- `docker-compose.yml` — Service definitions
- `backend/Dockerfile` — Python 3.11 + Django
- `frontend/Dockerfile` — Node 18 multi-stage build
- `nginx/Dockerfile` — Nginx 1.25
- `nginx/nginx.conf` — Reverse proxy rules
- `.env` — Environment variables
