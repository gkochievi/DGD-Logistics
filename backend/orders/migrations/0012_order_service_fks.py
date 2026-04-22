from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0011_alter_orderedithistory_id'),
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='suggested_service',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='suggested_orders',
                to='services.service',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='selected_service',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='selected_orders',
                to='services.service',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='final_service',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='final_orders',
                to='services.service',
            ),
        ),
    ]
