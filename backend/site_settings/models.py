from django.core.exceptions import ValidationError
from django.db import models

from config.media_utils import (
    site_settings_logo_path, site_settings_favicon_path,
)


class SiteSettings(models.Model):
    """Singleton model for site-wide branding & global settings.

    Holds values that are global to the whole platform (logo, name, theme,
    location defaults). Landing-page content lives separately in the
    `landing` app so the marketing CMS only owns marketing copy.
    """

    # ── Branding ──
    site_name = models.CharField(max_length=200, default='Heavyy Way')
    site_logo = models.ImageField(
        upload_to=site_settings_logo_path, blank=True, null=True,
        help_text='Logo shown in navbars across the site.',
    )
    favicon = models.ImageField(
        upload_to=site_settings_favicon_path, blank=True, null=True,
        help_text='Browser tab icon (recommended: 32x32 or 64x64 PNG).',
    )

    COLOR_THEME_CHOICES = [
        ('green', 'Green'),
        ('blue', 'Blue'),
        ('purple', 'Purple'),
        ('orange', 'Orange'),
        ('red', 'Red'),
        ('teal', 'Teal'),
        ('indigo', 'Indigo'),
        ('rose', 'Rose'),
    ]
    color_theme = models.CharField(
        max_length=20, choices=COLOR_THEME_CHOICES, default='green',
        help_text='Site-wide accent color palette.',
    )

    # ── Default location scope (used by location autocomplete on customer side) ──
    SEARCH_SCOPE_CHOICES = [
        ('georgia', 'Georgia only'),
        ('worldwide', 'Worldwide'),
        ('custom', 'Custom countries'),
    ]
    default_search_scope = models.CharField(
        max_length=20, choices=SEARCH_SCOPE_CHOICES, default='georgia',
    )
    default_search_countries = models.JSONField(
        default=list, blank=True,
        help_text='ISO codes when scope is "custom", e.g. ["ge","tr","az"].',
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    def __str__(self):
        return 'Site Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class RestrictedTimeWindow(models.Model):
    """Time-of-day restriction for transport in a named location.

    Used to enforce city-level rules (e.g. Tbilisi forbids special transport
    movement on city streets between 17:00 and 19:00). The customer order
    form blocks the matching hours when the pickup or destination address
    contains `location_keyword` (case-insensitive substring).
    """

    location_keyword = models.CharField(
        max_length=100,
        help_text='Substring matched (case-insensitive) against pickup/destination, e.g. "Tbilisi".',
    )
    start_time = models.TimeField(help_text='Start of the restricted window (inclusive).')
    end_time = models.TimeField(help_text='End of the restricted window (exclusive).')
    description = models.CharField(
        max_length=255, blank=True,
        help_text='Optional explanation shown to the customer.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['location_keyword', 'start_time']

    def __str__(self):
        return f'{self.location_keyword}: {self.start_time}–{self.end_time}'

    def clean(self):
        # An empty keyword would block every order; require at least one
        # non-whitespace character so the matcher has something to compare.
        if not (self.location_keyword or '').strip():
            raise ValidationError({'location_keyword': 'Location keyword is required.'})
        if self.start_time == self.end_time:
            raise ValidationError({'end_time': 'End time must differ from start time.'})

    def matches_location(self, location_text):
        if not location_text or not self.is_active:
            return False
        return self.location_keyword.lower().strip() in location_text.lower()

    def covers_time(self, t):
        """True if `t` falls inside this window. Wraps past midnight."""
        if t is None:
            return False
        if self.start_time <= self.end_time:
            return self.start_time <= t < self.end_time
        # Wrap-around window (e.g. 22:00–06:00).
        return t >= self.start_time or t < self.end_time
