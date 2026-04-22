import config.media_utils
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('categories', '0006_alter_transportcategory_description_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Service',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.JSONField(default=dict, help_text='{"en": "...", "ka": "...", "ru": "..."}')),
                ('slug', models.SlugField(blank=True, max_length=200, unique=True)),
                ('description', models.JSONField(blank=True, default=dict, help_text='{"en": "...", "ka": "...", "ru": "..."}')),
                ('icon', models.CharField(blank=True, default='tool', help_text='Ant Design icon name (e.g. tool, box, build, drop)', max_length=50)),
                ('image', models.ImageField(blank=True, help_text='Service image (replaces icon when set)', null=True, upload_to=config.media_utils.service_image_path)),
                ('color', models.CharField(blank=True, default='#1677ff', help_text='Hex color for the service (e.g. #1677ff)', max_length=7)),
                ('is_active', models.BooleanField(default=True)),
                ('suggestion_keywords', models.TextField(blank=True, help_text='Comma-separated keywords for auto-suggestion logic')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('car_categories', models.ManyToManyField(
                    blank=True,
                    help_text='Car categories that can perform this service',
                    related_name='services',
                    to='categories.transportcategory',
                )),
            ],
            options={
                'ordering': ['name'],
            },
        ),
    ]
