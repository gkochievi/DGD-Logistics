from django.db import models

from config.media_utils import (
    landing_site_icon_path, landing_favicon_path, landing_hero_path,
)


class LandingPageSettings(models.Model):
    """Singleton model – stores all editable landing page content."""

    # ── Branding ──
    site_name = models.CharField(max_length=200, default='Heavyy Way',
                                 help_text='Website name shown in navbar and browser tab')
    site_icon = models.ImageField(upload_to=landing_site_icon_path, blank=True, null=True,
                                  help_text='Website logo/icon shown in navbar')
    favicon = models.ImageField(upload_to=landing_favicon_path, blank=True, null=True,
                                help_text='Browser tab favicon (recommended: 32x32 or 64x64 PNG)')

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
        help_text='Site-wide accent color palette',
    )

    # ── Hero Section ──
    hero_title = models.JSONField(
        default=dict,
        help_text='{"en": "...", "ka": "...", "ru": "..."}',
    )
    hero_description = models.JSONField(default=dict)
    hero_image = models.ImageField(upload_to=landing_hero_path, blank=True, null=True)

    # ── Stats (shown below hero) ──
    stats = models.JSONField(
        default=list,
        help_text='[{"number": "500+", "label": {"en": "...", "ka": "...", "ru": "..."}}]',
    )

    # ── How It Works steps ──
    steps_title = models.JSONField(default=dict)
    steps = models.JSONField(
        default=list,
        help_text='[{"icon": "FileTextOutlined", "title": {...}, "description": {...}}]',
    )

    # ── Benefits / Why Choose Us ──
    benefits_title = models.JSONField(default=dict)
    benefits = models.JSONField(
        default=list,
        help_text='[{"icon": "RocketOutlined", "title": {...}, "description": {...}, "color": "#00B856"}]',
    )

    # ── Search / Location Settings ──
    SEARCH_SCOPE_CHOICES = [
        ('georgia', 'Georgia only'),
        ('worldwide', 'Worldwide'),
        ('custom', 'Custom countries'),
    ]
    search_scope = models.CharField(
        max_length=20, choices=SEARCH_SCOPE_CHOICES, default='georgia',
        help_text='Controls which countries are available in location search',
    )
    search_countries = models.JSONField(
        default=list, blank=True,
        help_text='List of ISO country codes when scope is "custom", e.g. ["ge","tr","az"]',
    )

    # ── CTA Section ──
    cta_title = models.JSONField(default=dict)
    cta_description = models.JSONField(default=dict)
    cta_button_text = models.JSONField(default=dict)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Landing Page Settings'
        verbose_name_plural = 'Landing Page Settings'

    def __str__(self):
        return 'Landing Page Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
