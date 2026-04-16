from django.db import models


class LandingPageSettings(models.Model):
    """Singleton model – stores all editable landing page content."""

    # ── Hero Section ──
    hero_badge = models.CharField(max_length=200, default='Heawy Way')
    hero_title = models.JSONField(
        default=dict,
        help_text='{"en": "...", "ka": "...", "ru": "..."}',
    )
    hero_description = models.JSONField(default=dict)
    hero_image = models.ImageField(upload_to='landing/', blank=True, null=True)

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
