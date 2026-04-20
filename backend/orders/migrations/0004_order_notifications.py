from django.db import migrations, models


def seed_last_event_at(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    for order in Order.objects.all():
        Order.objects.filter(pk=order.pk).update(
            last_event_at=order.updated_at or order.created_at,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_order_route_stops'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='is_read_by_admin',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='order',
            name='is_read_by_customer',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='order',
            name='last_event_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='last_event_type',
            field=models.CharField(blank=True, default='created', max_length=32),
        ),
        migrations.RunPython(seed_last_event_at, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='order',
            name='last_event_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
