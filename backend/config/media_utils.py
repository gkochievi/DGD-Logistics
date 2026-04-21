"""Shared helpers for media file storage.

Conventions:
- All uploaded filenames are replaced with a UUID4 hex + original extension
  (no user-provided names reach disk; no collisions).
- High-volume fields are partitioned by YYYY/MM.
- Child images (OrderImage, VehicleImage) are scoped under their parent id
  so all files for one entity live in one directory.
- Cleanup signals delete files on model delete and on field replace.
"""
import uuid
from pathlib import Path

from django.db import transaction
from django.db.models.signals import post_delete, pre_save
from django.utils import timezone


_ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.avif', '.heic'}


def _new_name(filename):
    ext = Path(filename or '').suffix.lower()
    if ext not in _ALLOWED_EXT:
        ext = ''
    return f'{uuid.uuid4().hex}{ext}'


def _dated(base, filename):
    now = timezone.now()
    return f'{base}/{now:%Y/%m}/{_new_name(filename)}'


# ── Upload-path callables (module-level so migrations can serialize them). ──

def user_avatar_path(instance, filename):
    return _dated('users/avatars', filename)


def driver_photo_path(instance, filename):
    return _dated('drivers/photos', filename)


def order_image_path(instance, filename):
    pid = getattr(instance, 'order_id', None) or 'unassigned'
    return f'orders/{pid}/{_new_name(filename)}'


def vehicle_main_image_path(instance, filename):
    return f'vehicles/main/{_new_name(filename)}'


def vehicle_gallery_image_path(instance, filename):
    pid = getattr(instance, 'vehicle_id', None) or 'unassigned'
    return f'vehicles/gallery/{pid}/{_new_name(filename)}'


def category_image_path(instance, filename):
    return f'categories/{_new_name(filename)}'


def landing_site_icon_path(instance, filename):
    return f'landing/site_icon/{_new_name(filename)}'


def landing_favicon_path(instance, filename):
    return f'landing/favicon/{_new_name(filename)}'


def landing_hero_path(instance, filename):
    return f'landing/hero/{_new_name(filename)}'


# ── Cleanup helpers (registered from each app's AppConfig.ready). ──

def _safe_delete(storage, name):
    if not name:
        return
    try:
        storage.delete(name)
    except Exception:
        pass


def register_file_cleanup(model_class, field_names):
    """Register pre_save + post_delete handlers that clean up files for the
    given field names on a model.

    - pre_save: when a FileField is replaced with a different file, the old
      file is deleted after the transaction commits.
    - post_delete: when the model row is deleted, all its file fields are
      deleted after commit.
    """
    if isinstance(field_names, str):
        field_names = [field_names]
    fields = tuple(field_names)
    uid_base = f'{model_class._meta.app_label}.{model_class.__name__}'

    def on_pre_save(sender, instance, **kwargs):
        if not instance.pk:
            return
        try:
            old = sender.objects.only(*fields).get(pk=instance.pk)
        except sender.DoesNotExist:
            return
        for fname in fields:
            old_file = getattr(old, fname, None)
            new_file = getattr(instance, fname, None)
            old_name = getattr(old_file, 'name', None)
            new_name = getattr(new_file, 'name', None)
            if old_name and old_name != new_name:
                storage = old_file.storage
                transaction.on_commit(lambda s=storage, n=old_name: _safe_delete(s, n))

    def on_post_delete(sender, instance, **kwargs):
        for fname in fields:
            f = getattr(instance, fname, None)
            name = getattr(f, 'name', None)
            if name:
                storage = f.storage
                transaction.on_commit(lambda s=storage, n=name: _safe_delete(s, n))

    pre_save.connect(
        on_pre_save, sender=model_class, weak=False,
        dispatch_uid=f'{uid_base}.media_cleanup.pre_save',
    )
    post_delete.connect(
        on_post_delete, sender=model_class, weak=False,
        dispatch_uid=f'{uid_base}.media_cleanup.post_delete',
    )
