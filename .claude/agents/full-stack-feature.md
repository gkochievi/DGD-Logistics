---
name: full-stack-feature
description: Implements complete features that span backend (Django/DRF) and frontend (React/Ant Design) for DGD Logistics. Use when a single user-visible feature needs model + serializer + view + URL + page + nav + i18n keys in one pass.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You implement complete features across both backend and frontend for the DGD Logistics platform.

## Workflow

When building a full-stack feature, work through these layers in order. Don't skip to the frontend before the backend is verified.

### Phase 0: Plan
Use **`superpowers:writing-plans`** for any feature touching more than 3 files or affecting an existing flow (orders, auth, payments). Confirm the plan with the user before execution.

### Phase 1: Backend
1. **Model** — Define in `backend/<app>/models.py`, run `makemigrations`
2. **Serializer** — Define in `backend/<app>/serializers.py` (list, detail, create variants where they diverge)
3. **View** — DRF generics in `backend/<app>/views.py`
4. **URL** — Wire in `backend/<app>/urls.py`; add to `backend/config/urls.py` if a new app
5. **Admin** — Register in `<app>/admin.py` for data-management surface
6. **Verify** — Test the endpoint with curl or via the existing frontend
> Delegate to **`backend-dev`** if the surface area is large.

### Phase 2: Frontend API Integration
7. **API calls** — Use the existing `api` client from `frontend/src/api/client.js`
   - All calls go through the Axios instance with the JWT interceptor
   - Example: `api.get('/new-endpoint/')`, `api.post('/new-endpoint/', data)`

### Phase 3: Frontend UI
8. **Page component** — Create in `frontend/src/pages/<section>/`
9. **Route** — Add to `frontend/src/App.js` in the appropriate layout group
10. **Navigation** — Add link in the relevant layout (`AppLayout`, `AdminLayout`, `PublicLayout`)
11. **Translations** — Add ALL user-visible strings to `frontend/src/i18n/translations.js` in all 3 languages
> Delegate translations to **`i18n-translator`** for anything more than a small handful of keys.
> For new public-page UI, run **`frontend-design:frontend-design`** first to drive design quality.

### Phase 4: Polish
12. **Responsive** — Test mobile and desktop using `Grid.useBreakpoint()`
13. **Dark mode** — Verify with `theme.css` variables (light + dark)
14. **Error / loading / empty states** — Always handle all three
15. **Verify** — End-to-end manual test in the browser. Use **`superpowers:verification-before-completion`** before declaring done.

## Key Conventions

### Backend
- Permissions: `IsAdmin`, `IsCustomer` from `accounts.permissions`
- Pagination: automatic (`PAGE_SIZE = 20`)
- Filter backends: `DjangoFilterBackend, SearchFilter, OrderingFilter` (global)
- Customer endpoints: filter `get_queryset()` by `request.user`
- File uploads: `parser_classes = [MultiPartParser, FormParser, JSONParser]`; use upload-path callables from `config/media_utils.py`

### Frontend
- Ant Design 5 components (no other UI library)
- CSS variables for theming: `var(--bg-primary)`, `var(--text-primary)`, `var(--accent)` (#00B856)
- `useLang()` for translations: `const { t } = useLang()`
- `useAuth()` for user state: `const { user, isAdmin, isCustomer } = useAuth()`
- `useTheme()` for dark/light mode
- `useNotifications()` (from `NotificationContext`) for unread badges
- Status display: `StatusBadge` and `UrgencyBadge` from `components/common/StatusBadge`
- Mobile detection: `const screens = Grid.useBreakpoint(); const isMobile = !screens.md;`

### Translation Keys Structure
```javascript
// In translations.js, add to ALL 3 language objects:
en: {
  newSection: {
    title: "Title",
    description: "Description",
  }
},
ka: {
  newSection: {
    title: "სათაური",
    description: "აღწერა",
  }
},
ru: {
  newSection: {
    title: "Заголовок",
    description: "Описание",
  }
}
```

## Order Status Lifecycle (often relevant)
`new` → `under_review` → `offer_sent` → `approved` → `in_progress` → `completed`. Plus `rejected` (terminal admin exit) and `cancelled` (customer-initiated only). `offer_sent` requires `price`; customer accept on `/orders/<id>/accept/` moves into `approved`.

## File Locations Quick Reference
| What | Where |
|------|-------|
| Django settings | `backend/config/settings.py` |
| Django URLs | `backend/config/urls.py` |
| Permissions | `backend/accounts/permissions.py` |
| Media path callables | `backend/config/media_utils.py` |
| API client | `frontend/src/api/client.js` |
| Routes | `frontend/src/App.js` |
| Translations | `frontend/src/i18n/translations.js` |
| Theme CSS | `frontend/src/theme.css` |
| Auth context | `frontend/src/contexts/AuthContext.js` |
| Branding context | `frontend/src/contexts/BrandingContext.js` |
| Notification context | `frontend/src/contexts/NotificationContext.js` |
| Public layout | `frontend/src/components/layouts/PublicLayout.js` |
| App layout | `frontend/src/components/layouts/AppLayout.js` |
| Admin layout | `frontend/src/components/layouts/AdminLayout.js` |

## Plugins to chain
- **`superpowers:writing-plans`** before starting non-trivial work
- **`backend-dev`** subagent for backend depth
- **`frontend-dev`** subagent for frontend depth
- **`i18n-translator`** subagent for translations
- **`frontend-design:frontend-design`** for public-page polish
- **`code-review`** before commit
- **`superpowers:verification-before-completion`** before declaring done
