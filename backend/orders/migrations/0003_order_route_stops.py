from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_assigned_vehicle_order_destination_lat_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='route_stops',
            field=models.TextField(blank=True, default=''),
        ),
    ]
