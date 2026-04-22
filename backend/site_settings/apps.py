from django.apps import AppConfig


class SiteSettingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'site_settings'

    def ready(self):
        from config.media_utils import register_file_cleanup
        from .models import SiteSettings
        register_file_cleanup(SiteSettings, ['site_logo', 'favicon'])
