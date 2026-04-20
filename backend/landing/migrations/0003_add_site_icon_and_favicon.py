from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('landing', '0002_landingpagesettings_search_countries_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='landingpagesettings',
            name='site_name',
            field=models.CharField(default='Heavyy Way', help_text='Website name shown in navbar and browser tab', max_length=200),
        ),
        migrations.AddField(
            model_name='landingpagesettings',
            name='site_icon',
            field=models.ImageField(blank=True, help_text='Website logo/icon shown in navbar', null=True, upload_to='landing/'),
        ),
        migrations.AddField(
            model_name='landingpagesettings',
            name='favicon',
            field=models.ImageField(blank=True, help_text='Browser tab favicon (recommended: 32x32 or 64x64 PNG)', null=True, upload_to='landing/'),
        ),
    ]
