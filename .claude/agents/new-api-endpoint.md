---
name: new-api-endpoint
description: Scaffolds a new DRF endpoint for DGD Logistics — model (if needed), serializer set, view with explicit permissions, URL wiring, admin registration, and migration. Use when a single new resource or action is being added to the backend.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You create complete API endpoints for the DGD Logistics platform, following existing patterns exactly.

## Workflow

### Step 1: Model (if needed)
File: `backend/<app>/models.py`
- Add model class with appropriate fields
- Include `created_at = DateTimeField(auto_now_add=True)` and `updated_at = DateTimeField(auto_now=True)` where relevant
- `__str__` for admin readability
- `class Meta: ordering = [...]` if a default ordering matters
- For multilingual text, use `JSONField(default=dict)` with `{en, ka, ru}` keys (see `services.Service.name`)
- For file fields, use upload-path callables from `backend/config/media_utils.py` (UUID rename + dated path) and register cleanup signals via `register_file_cleanup` in the app's `AppConfig.ready()`

### Step 2: Serializer
File: `backend/<app>/serializers.py`
- Subclass `ModelSerializer`
- Build separate serializers for divergent shapes:
  - `<Model>ListSerializer` — minimal fields for list views
  - `<Model>DetailSerializer` — full fields with nested relations
  - `<Model>CreateSerializer` — only writable fields, with validation
  - `<Model>PublicSerializer` — public-access shape (no sensitive data)
  - `Admin<Model>Serializer` — admin-only fields
- For file-bearing fields, expose a `<field>_url` `SerializerMethodField` that uses `request.build_absolute_uri(obj.<field>.url)` (don't expose raw paths to the client)
- Validate at the serializer (`validate(self, attrs)` and field-level methods)

### Step 3: View
File: `backend/<app>/views.py`
- Use DRF generic views
- Set `serializer_class`, `permission_classes`, and `queryset` (or `get_queryset`) on every view
- Permissions:
  - Public: `permission_classes = [permissions.AllowAny]`
  - Customer-only: `permission_classes = [permissions.IsAuthenticated]` + `get_queryset()` filters by `request.user`
  - Admin-only: `permission_classes = [permissions.IsAuthenticated, IsAdmin]` (`from accounts.permissions import IsAdmin`)
- For list views, declare `filterset_fields`, `search_fields`, `ordering_fields`. Filter backends are global; don't redeclare them.
- Override `perform_create()` to inject `request.user` (or via the serializer's `context`)
- For multipart endpoints: `parser_classes = [MultiPartParser, FormParser, JSONParser]`
- Add `select_related()` / `prefetch_related()` for any FK or reverse relation the serializer touches — list endpoints are the N+1 hot zone

### Step 4: URL
File: `backend/<app>/urls.py`
- Add the path to `urlpatterns`
- Convention: customer routes at root, admin routes under `admin/`
- If a new app: also add to `backend/config/urls.py`:
  ```python
  path('api/<app>/', include('<app>.urls')),
  ```

### Step 5: Admin Registration
File: `backend/<app>/admin.py`
- `@admin.register(Model)` with `ModelAdmin` subclass
- `list_display`, `list_filter`, `search_fields`, `readonly_fields` (for audit columns)

### Step 6: Migration
```bash
docker compose exec backend python manage.py makemigrations <app>
docker compose exec backend python manage.py migrate
```
> Hand off to **`db-migrations`** subagent if the migration is non-trivial (data migration, conflict, squash, no-op fix).

## Existing Patterns to Follow

### View example (orders / customer)
```python
class CustomerOrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    filterset_fields = ['status']
    search_fields = ['description', 'pickup_location']
    ordering_fields = ['created_at', 'requested_date']
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Order.objects
            .filter(user=self.request.user)
            .select_related(
                'selected_service', 'selected_category',
                'final_service', 'final_category',
                'assigned_vehicle', 'assigned_driver',
            )
            .prefetch_related('images')
        )
```

### View example (admin)
```python
class AdminVehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Vehicle.objects.all()
```

### Serializer example (public, multilingual)
```python
class TransportCategoryPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransportCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color', 'image']
```

## Important Notes
- Always import permissions from `accounts.permissions`: `from accounts.permissions import IsAdmin`
- Imports: `from rest_framework import generics, status, permissions`
- Customer endpoints **must** filter ownership in `get_queryset()` — never trust user_id from request data
- For file uploads, add `parser_classes = [MultiPartParser, FormParser, JSONParser]` and use a `media_utils.py` upload-path callable on the model field
- Return concrete error messages (`{'detail': '...'}` or per-field maps) — never bare 500s

## Plugins to leverage
- **`context7`** — for DRF reference / serializer field options
- **`code-review`** — self-review before commit
- **`superpowers:verification-before-completion`** — exercise the endpoint before declaring done
