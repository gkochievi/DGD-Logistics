from django.db import models
from django.utils.text import slugify

from config.media_utils import service_image_path


class Service(models.Model):
    """A service or cargo-type offering (e.g. tow, excavation, box moving).

    Each Service can be linked to one or more car categories (TransportCategory)
    that are capable of performing it — the same M2M style used by Vehicle.
    """
    name = models.JSONField(
        default=dict,
        help_text='{"en": "...", "ka": "...", "ru": "..."}',
    )
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.JSONField(
        default=dict, blank=True,
        help_text='{"en": "...", "ka": "...", "ru": "..."}',
    )
    icon = models.CharField(
        max_length=50, blank=True, default='tool',
        help_text='Ant Design icon name (e.g. tool, box, build, drop)'
    )
    image = models.ImageField(
        upload_to=service_image_path, blank=True, null=True,
        help_text='Service image (replaces icon when set)'
    )
    color = models.CharField(
        max_length=7, blank=True, default='#1677ff',
        help_text='Hex color for the service (e.g. #1677ff)'
    )
    car_categories = models.ManyToManyField(
        'categories.TransportCategory', related_name='services', blank=True,
        help_text='Car categories that can perform this service',
    )
    requires_destination = models.BooleanField(
        default=False,
        help_text='If true, order needs both pickup and destination (transport). '
                  'If false, just a work location.',
    )
    is_active = models.BooleanField(default=True)
    suggestion_keywords = models.TextField(
        blank=True,
        help_text='Comma-separated keywords for auto-suggestion logic'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        if isinstance(self.name, dict):
            return self.name.get('en', '') or next(iter(self.name.values()), '')
        return str(self.name)

    def save(self, *args, **kwargs):
        if not self.slug:
            en_name = self.name.get('en', '') if isinstance(self.name, dict) else str(self.name)
            self.slug = slugify(en_name) or 'service'
        super().save(*args, **kwargs)

    def get_keywords_list(self):
        if not self.suggestion_keywords:
            return []
        return [kw.strip().lower() for kw in self.suggestion_keywords.split(',') if kw.strip()]
