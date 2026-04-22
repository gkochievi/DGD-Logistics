from django.db import migrations


def copy_branding_from_landing(apps, schema_editor):
    """Seed SiteSettings from LandingPageSettings.

    Branding (site name, logo, favicon, color theme) and the location-scope
    fields used to live on LandingPageSettings. We move them to SiteSettings
    so global settings have a single source of truth; this migration carries
    the existing values across before the landing columns get dropped in
    landing/0008. File-field values are copied as-is (the `name` string),
    so the underlying files stay where they are on disk.
    """
    SiteSettings = apps.get_model('site_settings', 'SiteSettings')
    LandingPageSettings = apps.get_model('landing', 'LandingPageSettings')

    landing = LandingPageSettings.objects.filter(pk=1).first()
    site = SiteSettings.objects.filter(pk=1).first()
    if site is None:
        site = SiteSettings(pk=1)

    if landing is not None:
        site.site_name = getattr(landing, 'site_name', '') or 'Heavyy Way'
        site.color_theme = getattr(landing, 'color_theme', '') or 'green'
        site.default_search_scope = getattr(landing, 'search_scope', '') or 'georgia'
        site.default_search_countries = list(getattr(landing, 'search_countries', None) or [])
        # FileField/ImageField copies: assign the underlying name so the file
        # location persists. Avoid touching the file content itself.
        if getattr(landing, 'site_icon', None):
            site.site_logo.name = landing.site_icon.name
        if getattr(landing, 'favicon', None):
            site.favicon.name = landing.favicon.name

    site.save()


def noop_reverse(apps, schema_editor):
    """Reverse leaves SiteSettings populated; landing columns get re-added by
    landing migration's reverse path. No data needs to flow back."""


class Migration(migrations.Migration):

    dependencies = [
        ('site_settings', '0001_initial'),
        ('landing', '0007_alter_landingpagesettings_favicon_and_more'),
    ]

    operations = [
        migrations.RunPython(copy_branding_from_landing, noop_reverse),
    ]
