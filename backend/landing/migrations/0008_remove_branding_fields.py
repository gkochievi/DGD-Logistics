from django.db import migrations


class Migration(migrations.Migration):
    """Drop branding/location columns now owned by site_settings.SiteSettings.

    Depends on the data-copy migration so values are safely carried over
    before the columns disappear.
    """

    dependencies = [
        ('landing', '0007_alter_landingpagesettings_favicon_and_more'),
        ('site_settings', '0002_copy_from_landing'),
    ]

    operations = [
        migrations.RemoveField(model_name='landingpagesettings', name='site_name'),
        migrations.RemoveField(model_name='landingpagesettings', name='site_icon'),
        migrations.RemoveField(model_name='landingpagesettings', name='favicon'),
        migrations.RemoveField(model_name='landingpagesettings', name='color_theme'),
        migrations.RemoveField(model_name='landingpagesettings', name='search_scope'),
        migrations.RemoveField(model_name='landingpagesettings', name='search_countries'),
    ]
