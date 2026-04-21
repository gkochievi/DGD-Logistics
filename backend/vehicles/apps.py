from django.apps import AppConfig


class VehiclesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'vehicles'

    def ready(self):
        from config.media_utils import register_file_cleanup
        from .models import Vehicle, VehicleImage
        register_file_cleanup(Vehicle, 'image')
        register_file_cleanup(VehicleImage, 'image')
