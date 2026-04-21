from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'

    def ready(self):
        from config.media_utils import register_file_cleanup
        from .models import OrderImage
        register_file_cleanup(OrderImage, 'image')
