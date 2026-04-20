from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0003_transportcategory_requires_destination'),
    ]

    operations = [
        migrations.AddField(
            model_name='transportcategory',
            name='image',
            field=models.ImageField(
                blank=True, null=True,
                help_text='Category image (replaces icon when set)',
                upload_to='category_images/',
            ),
        ),
    ]
