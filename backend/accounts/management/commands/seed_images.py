"""Populate image fields on categories, services, and vehicles with
keyword-matched demo photos from loremflickr.com.

Idempotent by default — rows that already have an image are skipped. Pass
`--force` to overwrite. Pass `--only <kind>` to limit scope
(kinds: categories, services, vehicles).
"""
import time
import urllib.error
import urllib.request

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from categories.models import TransportCategory
from services.models import Service
from vehicles.models import Vehicle


# Slug → comma-separated loremflickr tags. Slugs come from
# django.utils.text.slugify(name) on the seeded category/service names.
KEYWORDS_BY_SLUG = {
    'tow-truck': 'tow,truck',
    'flatbed-truck': 'flatbed,truck',
    'concrete-mixer': 'concrete,mixer,truck',
    'dump-truck': 'dump,truck',
    'tanker-truck': 'tanker,truck',
    'refrigerated-truck': 'refrigerated,truck',
    'car-carrier': 'car,carrier,transporter',
    'lowboy-trailer': 'lowboy,trailer,truck',
    'crane-truck': 'crane,truck',
    'excavator': 'excavator',
    'bulldozer': 'bulldozer',
    'tractor': 'tractor,farm',
    'forklift': 'forklift,warehouse',
    'boom-lift-cherry-picker': 'cherry,picker,lift',
    'road-roller-compactor': 'road,roller,construction',
    'generator-truck': 'generator,truck',
}

_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '\
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'


def _keywords_for(slug, fallback='truck,transport'):
    return KEYWORDS_BY_SLUG.get(slug, fallback)


def _fetch(keywords, retries=2):
    url = f'https://loremflickr.com/640/480/{keywords}'
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': _UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            # Size floor filters out HTML error pages; loremflickr always
            # returns image/jpeg on success and 1KB+ of data.
            if len(data) > 1000:
                return data
            last_err = f'unexpected payload ({len(data)} bytes)'
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = str(e)
        time.sleep(1 + attempt)
    return None, last_err


class Command(BaseCommand):
    help = 'Seed demo images for categories, services, and vehicles.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force', action='store_true',
            help='Overwrite existing images.',
        )
        parser.add_argument(
            '--only', choices=['categories', 'services', 'vehicles'],
            help='Only seed the given kind.',
        )

    def handle(self, *args, **options):
        force = options['force']
        only = options['only']

        if only in (None, 'categories'):
            self._seed_categories(force)
        if only in (None, 'services'):
            self._seed_services(force)
        if only in (None, 'vehicles'):
            self._seed_vehicles(force)

    # ── Helpers ──────────────────────────────────────────────────────────

    def _attach(self, instance, filename, keywords):
        result = _fetch(keywords)
        if isinstance(result, tuple):
            self.stdout.write(self.style.WARNING(
                f'  {instance} - fetch failed ({result[1]})'))
            return False
        instance.image.save(filename, ContentFile(result), save=True)
        self.stdout.write(self.style.SUCCESS(f'  {instance} - image set'))
        return True

    def _seed_categories(self, force):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding category images...'))
        for cat in TransportCategory.objects.all():
            if cat.image and not force:
                self.stdout.write(f'  {cat} - skipped (has image)')
                continue
            self._attach(cat, f'{cat.slug}.jpg', _keywords_for(cat.slug))

    def _seed_services(self, force):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding service images...'))
        for svc in Service.objects.all():
            if svc.image and not force:
                self.stdout.write(f'  {svc} - skipped (has image)')
                continue
            self._attach(svc, f'{svc.slug}.jpg', _keywords_for(svc.slug))

    def _seed_vehicles(self, force):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding vehicle images...'))
        for v in Vehicle.objects.all():
            if v.image and not force:
                self.stdout.write(f'  {v} - skipped (has image)')
                continue
            first_cat = v.categories.first()
            keywords = _keywords_for(first_cat.slug) if first_cat else 'truck,vehicle'
            self._attach(v, f'vehicle-{v.plate_number}.jpg', keywords)
