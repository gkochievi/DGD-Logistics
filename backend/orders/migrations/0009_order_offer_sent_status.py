from django.db import migrations, models


def approved_without_acceptance_to_offer_sent(apps, schema_editor):
    """Pre-existing `approved` rows that predate the split: if the customer
    never accepted, they're really awaiting-approval — move them to
    `offer_sent` so the new semantics hold."""
    Order = apps.get_model('orders', 'Order')
    Order.objects.filter(status='approved', customer_accepted_at__isnull=True).update(
        status='offer_sent'
    )


def reverse_offer_sent_to_approved(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    Order.objects.filter(status='offer_sent').update(status='approved')


class Migration(migrations.Migration):
    dependencies = [('orders', '0008_order_customer_accepted_at')]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('new', 'New'),
                    ('under_review', 'Under Review'),
                    ('offer_sent', 'Offer Sent'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('in_progress', 'In Progress'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ],
                default='new',
                max_length=20,
            ),
        ),
        migrations.RunPython(
            approved_without_acceptance_to_offer_sent,
            reverse_code=reverse_offer_sent_to_approved,
        ),
    ]
