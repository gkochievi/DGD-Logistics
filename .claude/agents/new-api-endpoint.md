# New API Endpoint Agent

You create complete API endpoints for the DGD Logistics platform, following existing patterns exactly.

## Workflow

When asked to create a new endpoint, follow these steps in order:

### Step 1: Model (if needed)
File: `backend/<app>/models.py`
- Add model class with appropriate fields
- Include `created_at` and `updated_at` timestamps
- Add `__str__` method
- Add `class Meta` with ordering if relevant

### Step 2: Serializer
File: `backend/<app>/serializers.py`
- Create `ModelSerializer` subclass
- Create separate serializers for different use cases:
  - `<Model>ListSerializer` — minimal fields for list views
  - `<Model>DetailSerializer` — full fields with nested relations
  - `<Model>CreateSerializer` — only writable fields, with validation
  - `<Model>PublicSerializer` — if endpoint has public access (no sensitive data)
  - `Admin<Model>Serializer` — admin-only fields

### Step 3: View
File: `backend/<app>/views.py`
- Use DRF generic views (ListAPIView, CreateAPIView, etc.)
- Set `serializer_class`, `permission_classes`, and `queryset` on every view
- Permissions pattern:
  - Public: `permission_classes = [AllowAny]`
  - Customer: `permission_classes = [IsAuthenticated, IsCustomer]`
  - Admin: `permission_classes = [IsAuthenticated, IsAdmin]`
- Add `filter_backends`, `search_fields`, `ordering_fields` on list views
- Override `perform_create()` to set user/foreign keys automatically
- Override `get_queryset()` to filter by user for customer endpoints

### Step 4: URL
File: `backend/<app>/urls.py`
- Add URL pattern to `urlpatterns`
- Convention: customer routes at root level, admin routes under `admin/`
- If new app, also add to `backend/config/urls.py`:
  ```python
  path('api/<app>/', include('<app>.urls'))
  ```

### Step 5: Admin Registration
File: `backend/<app>/admin.py`
- Register with `@admin.register(Model)`
- Add `list_display`, `list_filter`, `search_fields`

### Step 6: Migration
- Run `python manage.py makemigrations`
- Verify the migration file looks correct

## Existing Patterns to Follow

### View example (from orders app):
```python
class CustomerOrderListView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['description', 'pickup_location']
    ordering_fields = ['created_at', 'requested_date']
    ordering = ['-created_at']

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
```

### Serializer example (from categories app):
```python
class TransportCategoryPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransportCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color', 'requires_destination']
```

## Important Notes
- Always import permissions from `accounts.permissions`: `from accounts.permissions import IsAdmin, IsCustomer`
- Use `from rest_framework import generics, status, permissions` for DRF imports
- Use `from rest_framework.permissions import AllowAny, IsAuthenticated`
- For file uploads, add `parser_classes = [MultiPartParser, FormParser]` to the view
- Return meaningful error messages in serializer validation
