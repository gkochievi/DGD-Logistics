from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='requires_destination',
            field=models.BooleanField(
                default=False,
                help_text='If true, order needs both pickup and destination (transport). '
                          'If false, just a work location.',
            ),
        ),
    ]
