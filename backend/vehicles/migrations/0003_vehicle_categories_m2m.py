from django.db import migrations, models


def copy_category_to_categories(apps, schema_editor):
    Vehicle = apps.get_model('vehicles', 'Vehicle')
    for vehicle in Vehicle.objects.all():
        if vehicle.category_id:
            vehicle.categories.add(vehicle.category_id)


def copy_categories_to_category(apps, schema_editor):
    Vehicle = apps.get_model('vehicles', 'Vehicle')
    for vehicle in Vehicle.objects.all():
        first = vehicle.categories.first()
        if first:
            vehicle.category_id = first.id
            vehicle.save(update_fields=['category'])


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0001_initial'),
        ('vehicles', '0002_vehicle_license_categories_vehicleimage'),
    ]

    operations = [
        # Free up the 'vehicles' reverse accessor on TransportCategory so the
        # new M2M can claim it. The FK is about to be removed, so the legacy
        # reverse name no longer matters.
        migrations.AlterField(
            model_name='vehicle',
            name='category',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='vehicles_legacy',
                to='categories.transportcategory',
            ),
        ),
        migrations.AddField(
            model_name='vehicle',
            name='categories',
            field=models.ManyToManyField(
                blank=True, related_name='vehicles', to='categories.transportcategory',
            ),
        ),
        migrations.RunPython(
            copy_category_to_categories,
            reverse_code=copy_categories_to_category,
        ),
        migrations.AlterModelOptions(
            name='vehicle',
            options={'ordering': ['name']},
        ),
        migrations.RemoveField(
            model_name='vehicle',
            name='category',
        ),
    ]
