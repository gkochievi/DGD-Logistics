import json
from django.db import migrations, models


def convert_to_json(apps, schema_editor):
    """Copy existing plain-text name/description into the new JSON columns."""
    TransportCategory = apps.get_model('categories', 'TransportCategory')
    for cat in TransportCategory.objects.all():
        cat.name_i18n = {'en': cat.name or '', 'ka': '', 'ru': ''}
        cat.description_i18n = {'en': cat.description or '', 'ka': '', 'ru': ''}
        cat.save(update_fields=['name_i18n', 'description_i18n'])


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0004_add_category_image'),
    ]

    operations = [
        # Step 1: Add temporary JSON columns
        migrations.AddField(
            model_name='transportcategory',
            name='name_i18n',
            field=models.JSONField(default=dict, blank=True),
        ),
        migrations.AddField(
            model_name='transportcategory',
            name='description_i18n',
            field=models.JSONField(default=dict, blank=True),
        ),
        # Step 2: Copy data from old text columns to new JSON columns
        migrations.RunPython(convert_to_json, migrations.RunPython.noop),
        # Step 3: Remove old columns
        migrations.RemoveField(model_name='transportcategory', name='name'),
        migrations.RemoveField(model_name='transportcategory', name='description'),
        # Step 4: Rename new columns to original names
        migrations.RenameField(model_name='transportcategory', old_name='name_i18n', new_name='name'),
        migrations.RenameField(model_name='transportcategory', old_name='description_i18n', new_name='description'),
    ]
