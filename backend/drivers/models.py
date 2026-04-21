from django.db import models


class Driver(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_ON_LEAVE = 'on_leave'
    STATUS_INACTIVE = 'inactive'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_ON_LEAVE, 'On Leave'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    license_number = models.CharField(max_length=50, unique=True)
    license_categories = models.CharField(
        max_length=50, blank=True,
        help_text='Comma-separated license categories, e.g. "B,C,CE"'
    )
    license_expiry = models.DateField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to='driver_photos/', blank=True, null=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    is_active = models.BooleanField(default=True)
    vehicles = models.ManyToManyField(
        'vehicles.Vehicle', related_name='drivers', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.license_number})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_busy(self):
        """True if the driver has any active-status orders assigned right now."""
        from orders.models import Order
        return self.orders.filter(status__in=Order.ACTIVE_STATUSES).exists()
