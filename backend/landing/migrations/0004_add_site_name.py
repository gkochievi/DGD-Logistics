from django.db import migrations


class Migration(migrations.Migration):
    """No-op: site_name was already added by 0003_add_site_icon_and_favicon.

    The original AddField here duplicated 0003 and failed on fresh databases
    with `column "site_name" already exists`. Kept as an empty migration so
    later migrations that depend on this name continue to resolve.
    """

    dependencies = [
        ('landing', '0003_add_site_icon_and_favicon'),
    ]

    operations = []
