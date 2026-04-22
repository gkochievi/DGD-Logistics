import config.media_utils
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='SiteSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('site_name', models.CharField(default='Heavyy Way', max_length=200)),
                ('site_logo', models.ImageField(blank=True, help_text='Logo shown in navbars across the site.', null=True, upload_to=config.media_utils.site_settings_logo_path)),
                ('favicon', models.ImageField(blank=True, help_text='Browser tab icon (recommended: 32x32 or 64x64 PNG).', null=True, upload_to=config.media_utils.site_settings_favicon_path)),
                ('color_theme', models.CharField(choices=[('green', 'Green'), ('blue', 'Blue'), ('purple', 'Purple'), ('orange', 'Orange'), ('red', 'Red'), ('teal', 'Teal'), ('indigo', 'Indigo'), ('rose', 'Rose')], default='green', help_text='Site-wide accent color palette.', max_length=20)),
                ('default_search_scope', models.CharField(choices=[('georgia', 'Georgia only'), ('worldwide', 'Worldwide'), ('custom', 'Custom countries')], default='georgia', max_length=20)),
                ('default_search_countries', models.JSONField(blank=True, default=list, help_text='ISO codes when scope is "custom", e.g. ["ge","tr","az"].')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Site Settings',
                'verbose_name_plural': 'Site Settings',
            },
        ),
        migrations.CreateModel(
            name='RestrictedTimeWindow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('location_keyword', models.CharField(help_text='Substring matched (case-insensitive) against pickup/destination, e.g. "Tbilisi".', max_length=100)),
                ('start_time', models.TimeField(help_text='Start of the restricted window (inclusive).')),
                ('end_time', models.TimeField(help_text='End of the restricted window (exclusive).')),
                ('description', models.CharField(blank=True, help_text='Optional explanation shown to the customer.', max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['location_keyword', 'start_time'],
            },
        ),
    ]
