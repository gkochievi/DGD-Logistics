from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landing', '0003_add_site_icon_and_favicon'),
    ]

    operations = [
        migrations.AddField(
            model_name='landingpagesettings',
            name='site_name',
            field=models.CharField(default='Heavyy Way', help_text='Website name shown in navbar and browser tab', max_length=200),
        ),
    ]
