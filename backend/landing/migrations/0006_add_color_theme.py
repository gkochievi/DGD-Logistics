from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landing', '0005_remove_hero_badge'),
    ]

    operations = [
        migrations.AddField(
            model_name='landingpagesettings',
            name='color_theme',
            field=models.CharField(
                choices=[
                    ('green', 'Green'),
                    ('blue', 'Blue'),
                    ('purple', 'Purple'),
                    ('orange', 'Orange'),
                    ('red', 'Red'),
                    ('teal', 'Teal'),
                    ('indigo', 'Indigo'),
                    ('rose', 'Rose'),
                ],
                default='green',
                help_text='Site-wide accent color palette',
                max_length=20,
            ),
        ),
    ]
