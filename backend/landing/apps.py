from django.apps import AppConfig


class LandingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'landing'

    def ready(self):
        from config.media_utils import register_file_cleanup
        from .models import LandingPageSettings
        register_file_cleanup(
            LandingPageSettings, ['site_icon', 'favicon', 'hero_image'],
        )
