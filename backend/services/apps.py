from django.apps import AppConfig


class ServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'services'

    def ready(self):
        from config.media_utils import register_file_cleanup
        from .models import Service
        register_file_cleanup(Service, 'image')
