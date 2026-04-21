"""Order assignment validation and vehicle/driver state synchronization.

Keeps Order <-> Vehicle <-> Driver logically consistent:
- License categories: driver must cover vehicle's required categories
- Driver must be linked to vehicle via Vehicle.drivers M2M
- Time windows: no overlapping active-status orders on same vehicle/driver
- Resource status gates: retired/maintenance vehicles, inactive/on-leave drivers blocked
- Vehicle.status auto-flips in_use <-> available based on active assignments
"""
from django.db.models import Q
from rest_framework import serializers


def parse_categories(raw):
    if not raw:
        return set()
    return {c.strip().upper() for c in raw.split(',') if c.strip()}


def windows_overlap(a_from, a_to, b_from, b_to):
    """Return True if two [from, to] windows overlap.

    Treats missing bounds as open-ended (None from = -inf, None to = +inf).
    If both orders have no schedule at all, we consider them overlapping
    (can't both be concurrently active on the same resource).
    """
    if a_from is None and a_to is None and b_from is None and b_to is None:
        return True
    if a_to is not None and b_from is not None and a_to <= b_from:
        return False
    if b_to is not None and a_from is not None and b_to <= a_from:
        return False
    return True


def active_orders_on_vehicle(vehicle, exclude_order_id=None):
    from .models import Order
    qs = Order.objects.filter(
        assigned_vehicle=vehicle,
        status__in=Order.ACTIVE_STATUSES,
    )
    if exclude_order_id:
        qs = qs.exclude(pk=exclude_order_id)
    return qs


def active_orders_on_driver(driver, exclude_order_id=None):
    from .models import Order
    qs = Order.objects.filter(
        assigned_driver=driver,
        status__in=Order.ACTIVE_STATUSES,
    )
    if exclude_order_id:
        qs = qs.exclude(pk=exclude_order_id)
    return qs


def check_conflict(existing_qs, scheduled_from, scheduled_to):
    """Return the first conflicting order, or None."""
    for o in existing_qs:
        if windows_overlap(scheduled_from, scheduled_to, o.scheduled_from, o.scheduled_to):
            return o
    return None


def validate_assignment(order, vehicle=None, driver=None,
                        scheduled_from=None, scheduled_to=None,
                        target_status=None):
    """Validate a prospective assignment. Raises DRF ValidationError on issues.

    Pass the fully-resolved target values (post-update) for all arguments —
    the caller should merge the incoming patch with instance values first.
    """
    errors = {}

    # Time window sanity
    if scheduled_from and scheduled_to and scheduled_to <= scheduled_from:
        errors['scheduled_to'] = 'End time must be after start time.'

    # Vehicle-level gates (only when a vehicle is being assigned)
    if vehicle is not None:
        if not vehicle.is_active:
            errors['assigned_vehicle'] = 'Selected vehicle is inactive.'
        elif vehicle.status in ('maintenance', 'retired'):
            errors['assigned_vehicle'] = (
                f'Vehicle is {vehicle.get_status_display().lower()} and cannot be assigned.'
            )

    # Driver-level gates
    if driver is not None:
        if not driver.is_active:
            errors['assigned_driver'] = 'Selected driver is inactive.'
        elif driver.status != 'active':
            errors['assigned_driver'] = (
                f'Driver is {driver.get_status_display().lower()} and cannot be assigned.'
            )

    # Driver must be linked to vehicle, and license must cover it
    if vehicle is not None and driver is not None:
        if not driver.vehicles.filter(pk=vehicle.pk).exists():
            errors['assigned_driver'] = (
                'Driver is not assigned to operate this vehicle. '
                'Link them in driver management first.'
            )
        required = parse_categories(vehicle.license_categories)
        covered = parse_categories(driver.license_categories)
        missing = required - covered
        if missing:
            errors['assigned_driver'] = (
                f"Driver license missing: {', '.join(sorted(missing))}."
            )

    # Overlap check — only relevant when the order will occupy the resource
    effective_status = target_status or order.status
    will_be_active = effective_status in order.ACTIVE_STATUSES

    if will_be_active:
        if vehicle is not None:
            conflict = check_conflict(
                active_orders_on_vehicle(vehicle, exclude_order_id=order.pk),
                scheduled_from, scheduled_to,
            )
            if conflict:
                errors['assigned_vehicle'] = (
                    f'Vehicle is already booked on order #{conflict.pk} for an overlapping time.'
                )
        if driver is not None:
            conflict = check_conflict(
                active_orders_on_driver(driver, exclude_order_id=order.pk),
                scheduled_from, scheduled_to,
            )
            if conflict:
                errors['assigned_driver'] = (
                    f'Driver is already booked on order #{conflict.pk} for an overlapping time.'
                )

    if errors:
        raise serializers.ValidationError(errors)


def sync_vehicle_status(vehicle):
    """Set vehicle.status to in_use/available based on active orders.

    Does not override maintenance/retired — those are admin-set.
    """
    if not vehicle:
        return
    if vehicle.status in ('maintenance', 'retired'):
        return
    from .models import Order
    is_busy = Order.objects.filter(
        assigned_vehicle=vehicle,
        status__in=Order.ACTIVE_STATUSES,
    ).exists()
    target = 'in_use' if is_busy else 'available'
    if vehicle.status != target:
        vehicle.status = target
        vehicle.save(update_fields=['status', 'updated_at'])
