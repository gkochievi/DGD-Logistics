from django.db import models

from config.media_utils import vehicle_main_image_path, vehicle_gallery_image_path


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
    categories = models.ManyToManyField(
        'categories.TransportCategory', related_name='vehicles', blank=True,
    )
    plate_number = models.CharField(max_length=20, unique=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    capacity = models.CharField(
        max_length=100, blank=True,
        help_text='e.g. 20 tons, 15m3, 5 cars'
    )
    description = models.TextField(blank=True)
    license_categories = models.CharField(
        max_length=50, blank=True,
        help_text='Comma-separated required license categories, e.g. "C,CE"'
    )
    price_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Hourly rate in local currency'
    )
    price_per_km = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Per-kilometer rate'
    )
    image = models.ImageField(upload_to=vehicle_main_image_path, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.plate_number})'


class VehicleImage(models.Model):
    MAX_IMAGES = 5

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=vehicle_gallery_image_path)
    order = models.PositiveIntegerField(default=0)
    # When true, this is the photo shown on the public landing page for the
    # vehicle's category. Exactly one (or zero) primary per vehicle — enforced
    # at the API layer.
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Primary photo first so `vehicle.images.all()[0]` is the one to show.
        ordering = ['-is_primary', 'order', 'created_at']

    def __str__(self):
        return f'Image for Vehicle #{self.vehicle_id}'
