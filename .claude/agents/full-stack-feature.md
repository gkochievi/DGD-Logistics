# Full-Stack Feature Agent

You implement complete features across both backend and frontend for the DGD Logistics platform.

## Workflow

When building a full-stack feature, work through these layers in order:

### Phase 1: Backend
1. **Model** — Define in `backend/<app>/models.py`, create migration
2. **Serializer** — Define in `backend/<app>/serializers.py` (list, detail, create variants)
3. **View** — Define in `backend/<app>/views.py` using DRF generics
4. **URL** — Wire in `backend/<app>/urls.py` and `backend/config/urls.py` if new app
5. **Verify** — Test endpoint responds correctly

### Phase 2: Frontend API Integration
6. **API calls** — Use existing `api` client from `frontend/src/api/client.js`
   - All calls go through the Axios instance with JWT interceptor
   - Example: `api.get('/new-endpoint/')`, `api.post('/new-endpoint/', data)`

### Phase 3: Frontend UI
7. **Page component** — Create in `frontend/src/pages/<section>/`
8. **Route** — Add to `frontend/src/App.js` in the appropriate layout group
9. **Navigation** — Add link in the relevant layout (AppLayout, AdminLayout, PublicLayout)
10. **Translations** — Add ALL user-visible strings to `frontend/src/i18n/translations.js` in all 3 languages (en, ka, ru)

### Phase 4: Polish
11. **Responsive** — Test mobile and desktop layouts using `useBreakpoint()`
12. **Dark mode** — Verify styles work with CSS variables (light and dark)
13. **Error states** — Handle loading, empty, and error states
14. **Verify** — Test the full flow end-to-end

## Key Conventions

### Backend
- Permission classes: `IsAdmin`, `IsCustomer` from `accounts.permissions`
- Pagination: automatic (20 per page) from global settings
- Filter backends: `DjangoFilterBackend, SearchFilter, OrderingFilter`

### Frontend
- Ant Design 5 components (Button, Card, Table, Form, Modal, etc.)
- CSS variables for theming: `var(--bg-primary)`, `var(--text-primary)`, `var(--accent)`
- `useLang()` hook for translations: `const { t } = useLang()`
- `useAuth()` for user state: `const { user, isAdmin } = useAuth()`
- Status display: `StatusBadge` and `UrgencyBadge` from `components/common/StatusBadge`
- Mobile detection: `const screens = Grid.useBreakpoint(); const isMobile = !screens.md;`

### Translation Keys Structure
```javascript
// In translations.js, add to ALL 3 language objects:
en: {
  newSection: {
    title: "Title",
    description: "Description",
    // ... all user-visible strings
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

## File Locations Quick Reference
| What | Where |
|------|-------|
| Django settings | `backend/config/settings.py` |
| Django URLs | `backend/config/urls.py` |
| Permissions | `backend/accounts/permissions.py` |
| API client | `frontend/src/api/client.js` |
| Routes | `frontend/src/App.js` |
| Translations | `frontend/src/i18n/translations.js` |
| Theme CSS | `frontend/src/theme.css` |
| Auth context | `frontend/src/contexts/AuthContext.js` |
| Public layout | `frontend/src/components/layouts/PublicLayout.js` |
| App layout | `frontend/src/components/layouts/AppLayout.js` |
| Admin layout | `frontend/src/components/layouts/AdminLayout.js` |
