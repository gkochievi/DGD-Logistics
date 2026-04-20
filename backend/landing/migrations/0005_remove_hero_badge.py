from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('landing', '0004_add_site_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='landingpagesettings',
            name='hero_badge',
        ),
    ]
