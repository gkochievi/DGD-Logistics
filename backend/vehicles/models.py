from django.db import models


class Vehicle(models.Model):
    STATUS_AVAILABLE = 'available'
    STATUS_IN_USE = 'in_use'
    STATUS_MAINTENANCE = 'maintenance'
    STATUS_RETIRED = 'retired'

    STATUS_CHOICES = [
        (STATUS_AVAILABLE, 'Available'),
        (STATUS_IN_USE, 'In Use'),
        (STATUS_MAINTENANCE, 'Maintenance'),
        (STATUS_RETIRED, 'Retired'),
    ]

    name = models.CharField(max_length=200, help_text='e.g. Mercedes Actros Tow Truck')
    category = models.ForeignKey(
        'categories.TransportCategory', on_delete=models.CASCADE, related_name='vehicles'
    )
    plate_number = models.CharField(max_length=20, unique=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    capacity = models.CharField(
        max_length=100, blank=True,
        help_text='e.g. 20 tons, 15m3, 5 cars'
    )
    description = models.TextField(blank=True)
    price_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Hourly rate in local currency'
    )
    price_per_km = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Per-kilometer rate'
    )
    image = models.ImageField(upload_to='vehicle_images/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.name} ({self.plate_number})'
