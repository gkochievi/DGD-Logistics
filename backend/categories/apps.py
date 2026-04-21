from django.apps import AppConfig


class CategoriesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'categories'

    def ready(self):
        from config.media_utils import register_file_cleanup
        from .models import TransportCategory
        register_file_cleanup(TransportCategory, 'image')
