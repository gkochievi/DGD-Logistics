from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_alter_orderimage_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='price',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
