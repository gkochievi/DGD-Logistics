from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0006_alter_transportcategory_description_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='transportcategory',
            name='requires_destination',
        ),
    ]
