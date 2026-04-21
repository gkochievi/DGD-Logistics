from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('orders', '0007_order_price')]
    operations = [
        migrations.AddField(
            model_name='order',
            name='customer_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
