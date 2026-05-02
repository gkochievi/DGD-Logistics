import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography, Spin, Button, Timeline, Image, Space,
  Select, Input, InputNumber, message, Empty, Grid, Divider, DatePicker, TimePicker, Tag, Alert, Modal, Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { useRealtimeRefresh, useNotifications } from '../../contexts/NotificationContext';
import {
  ArrowLeftOutlined, TagOutlined, CarOutlined, SyncOutlined,
  CommentOutlined, EnvironmentOutlined, PictureOutlined, HistoryOutlined,
  ThunderboltOutlined, UserOutlined, ClockCircleOutlined, DollarOutlined,
  PhoneOutlined, SendOutlined, CheckCircleOutlined,
  EditOutlined, PlusOutlined, DeleteOutlined,
  InfoCircleOutlined, SettingOutlined,
  CopyOutlined, MailOutlined, DownloadOutlined, TeamOutlined,
  ExclamationCircleFilled, RightOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_OPTIONS, STATUS_CONFIG } from '../../utils/status';
import MapPicker, { MapView } from '../../components/map/MapPicker';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';
import { useLang } from '../../contexts/LanguageContext';
import { useBranding } from '../../contexts/BrandingContext';
import { DEFAULT_CURRENCY } from '../../utils/currency';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t, lang } = useLang();
  const { currency = DEFAULT_CURRENCY } = useBranding();
  const localized = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v[lang] || v['en'] || '';
  };
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  // Use `null` as the "user hasn't touched the textarea" sentinel — mirrors
  // the priceDraft pattern. `''` is a real user state (a deliberate clear),
  // so silent refreshes must not overwrite it back to admin_comment.
  const [comment, setComment] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [priceDraft, setPriceDraft] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPickupStops, setEditPickupStops] = useState([]);
  const [editDestStops, setEditDestStops] = useState([]);
  // Which stop the in-modal map is currently pinning. Mirrors the customer's
  // NewOrderFlow active-stop pattern so admins can switch between stops and
  // tap the map to drop a marker.
  const [editActiveStop, setEditActiveStop] = useState({ type: 'pickup', index: 0 });
  // Defer mounting Leaflet until the modal's open animation has finished.
  // If we render MapContainer while the modal slot is still animating from
  // 0×0 to its final size, Leaflet's internal pixel math computes against
  // bogus dimensions and getCenter()/getZoom() come back NaN — every later
  // flyTo() then floods the console with "Invalid LatLng (NaN, NaN)".
  const [editMapReady, setEditMapReady] = useState(false);
  const [editDate, setEditDate] = useState(null);
  const [editTime, setEditTime] = useState(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCargoDetails, setEditCargoDetails] = useState('');
  const [editUrgency, setEditUrgency] = useState('normal');
  const [editSaving, setEditSaving] = useState(false);
  const { refresh: refreshNotifications } = useNotifications();

  useEffect(() => {
    api.get('/services/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    });
    api.get('/vehicles/admin/').then(({ data }) => {
      const results = data.results || data;
      setVehicles(Array.isArray(results) ? results : []);
    });
    api.get('/drivers/admin/').then(({ data }) => {
      const results = data.results || data;
      setDrivers(Array.isArray(results) ? results : []);
    });
  }, []);

  // Drivers licensed to operate the currently-assigned vehicle AND linked to it.
  const eligibleDrivers = useMemo(() => {
    if (!order?.assigned_vehicle) return [];
    return drivers.filter((d) => {
      const linked = (d.vehicles || []).some((v) => v.id === order.assigned_vehicle);
      return linked && d.is_active && d.status === 'active';
    });
  }, [drivers, order?.assigned_vehicle]);

  // Vehicles — show all but flag busy ones with active-order counts.
  const assignedVehicleId = order?.assigned_vehicle;
  const vehicleOptions = useMemo(() => {
    return vehicles.map((v) => {
      const isCurrent = v.id === assignedVehicleId;
      const busy = (v.active_orders_count || 0) > 0 && !isCurrent;
      const catName = (v.categories_detail || [])
        .map((c) => (typeof c.name === 'string' ? c.name : (c.name?.[lang] || c.name?.en || '')))
        .filter(Boolean)
        .join(', ');
      const statusBadge = v.status !== 'available' && !isCurrent
        ? ` · ${v.status_display || v.status}`
        : '';
      return {
        value: v.id,
        label: `${v.name} (${v.plate_number}) — ${catName}${statusBadge}${busy ? ' · busy' : ''}`,
        disabled: !isCurrent && (v.status === 'maintenance' || v.status === 'retired' || !v.is_active),
      };
    });
  }, [vehicles, assignedVehicleId, lang]);

  const fetchOrder = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    return api.get(`/orders/admin/${id}/`).then(({ data }) => {
      setOrder(data);
      setNewStatus((prev) => prev || data.status);
      // Don't fill comment from server — `comment === null` means
      // "untouched" and the textarea falls back to data.admin_comment via
      // its render expression. Setting the string here would clobber a
      // user-cleared textarea on every silent refresh.
      setPriceDraft((prev) => (prev !== null ? prev : (data.price !== null && data.price !== undefined ? Math.round(Number(data.price)) : null)));
      // backend auto-marks this order as read; refresh the bell badge quickly
      refreshNotifications();
    }).catch(() => { if (!silent) message.error(t('adminOrderDetail.orderNotFound')); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [id, t, refreshNotifications]);

  useRealtimeRefresh(useCallback(() => {
    fetchOrder({ silent: true });
  }, [fetchOrder]));

  useEffect(() => { fetchOrder(); }, [id]); // eslint-disable-line

  const applyStatusChange = async (effectiveComment) => {
    setUpdating(true);
    try {
      await api.post(`/orders/admin/${id}/status/`, {
        status: newStatus,
        comment: effectiveComment,
      });
      message.success(t('adminOrderDetail.statusUpdated'));
      // Reset to "untouched" so the next fetch's admin_comment shows through.
      setComment(null);
      fetchOrder();
    } catch (err) {
      message.error(extractApiError(err, t('adminOrderDetail.statusUpdateFailed')));
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = () => {
    if (!newStatus || newStatus === order.status) {
      message.warning(t('adminOrderDetail.selectDifferent'));
      return;
    }
    // Falsy-||-fallback would re-inherit admin_comment when the user has
    // intentionally cleared the textarea; check explicitly against null.
    const effectiveComment = (comment !== null ? comment : (order.admin_comment || '')).trim();
    if (newStatus === 'rejected' && !effectiveComment) {
      message.error(t('adminOrderDetail.rejectCommentRequired'));
      return;
    }
    if (newStatus === 'rejected') {
      Modal.confirm({
        title: t('adminOrderDetail.rejectConfirmTitle'),
        content: t('adminOrderDetail.rejectConfirmContent'),
        okText: t('adminOrderDetail.rejectConfirmOk'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => applyStatusChange(effectiveComment),
      });
      return;
    }
    applyStatusChange(effectiveComment);
  };

  const handleCategoryChange = async (serviceId) => {
    try {
      await api.patch(`/orders/admin/${id}/`, { final_service: serviceId });
      message.success(t('adminOrderDetail.serviceUpdated'));
      fetchOrder();
    } catch {
      message.error(t('adminOrderDetail.serviceUpdateFailed'));
    }
  };

  const patchOrder = async (payload, successMsg, failMsg) => {
    try {
      await api.patch(`/orders/admin/${id}/`, payload);
      message.success(successMsg);
      fetchOrder();
      return true;
    } catch (err) {
      const detail = err.response?.data;
      const firstErr = detail && typeof detail === 'object'
        ? Object.values(detail).flat()[0]
        : null;
      message.error(typeof firstErr === 'string' ? firstErr : failMsg);
      return false;
    }
  };

  const handleVehicleAssign = async (vehicleId) => {
    // Changing vehicle invalidates the driver link; clear driver in the same patch.
    const payload = { assigned_vehicle: vehicleId || null };
    if (order.assigned_driver && vehicleId !== order.assigned_vehicle) {
      payload.assigned_driver = null;
    }
    await patchOrder(payload, t('adminOrderDetail.vehicleAssigned'), t('adminOrderDetail.vehicleAssignFailed'));
  };

  const handleDriverAssign = async (driverId) => {
    await patchOrder(
      { assigned_driver: driverId || null },
      t('adminOrderDetail.driverAssigned'),
      t('adminOrderDetail.driverAssignFailed'),
    );
  };

  const handleScheduleChange = async (range) => {
    const [from, to] = range || [null, null];
    await patchOrder(
      {
        scheduled_from: from ? from.toISOString() : null,
        scheduled_to: to ? to.toISOString() : null,
      },
      t('adminOrderDetail.scheduleUpdated'),
      t('adminOrderDetail.scheduleUpdateFailed'),
    );
  };

  const handlePriceSave = async () => {
    if (priceDraft === null || priceDraft === undefined || priceDraft === '' || Number(priceDraft) <= 0) {
      message.error(t('adminOrderDetail.priceInvalid'));
      return;
    }
    await patchOrder(
      { price: Number(priceDraft) },
      t('adminOrderDetail.priceSaved'),
      t('adminOrderDetail.priceSaveFailed'),
    );
  };

  const handleUrgencyChange = async (urgency) => {
    try {
      await api.patch(`/orders/admin/${id}/`, { urgency });
      message.success(t('adminOrderDetail.urgencyUpdated'));
      fetchOrder();
    } catch {
      message.error(t('adminOrderDetail.urgencyUpdateFailed'));
    }
  };

  // Surface a usable message from a DRF error payload regardless of whether
  // the backend returned `{detail: ...}`, `{field: "..."}`, `{field: [...]}`,
  // or a plain string. Without this, field-level validation errors (e.g. an
  // overlapping driver booking) collapse to the generic "Status update
  // failed" toast and the admin has no way to see the real reason.
  const extractApiError = (err, fallback) => {
    const data = err?.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (typeof data === 'object') {
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && v.length) return String(v[0]);
        if (typeof v === 'string' && v) return v;
      }
    }
    return fallback;
  };

  const handleSendOffer = () => {
    const priceNum = priceDraft === null || priceDraft === undefined || priceDraft === ''
      ? null : Number(priceDraft);
    if (priceNum === null || !Number.isFinite(priceNum) || priceNum <= 0) {
      message.error(t('adminOrderDetail.priceInvalid'));
      return;
    }
    if (!order.assigned_vehicle || !order.assigned_driver) {
      message.error(t('adminOrderDetail.missingForOffer'));
      return;
    }
    Modal.confirm({
      title: t('adminOrderDetail.sendForApprovalConfirm'),
      content: t('adminOrderDetail.sendForApprovalContent'),
      okText: t('adminOrderDetail.sendForApprovalOk'),
      okType: 'primary',
      cancelText: t('common.cancel'),
      onOk: async () => {
        setUpdating(true);
        try {
          // Persist the latest typed price so admin doesn't need a separate Save step.
          if (priceNum !== Number(order.price)) {
            await api.patch(`/orders/admin/${id}/`, { price: priceNum });
          }
          await api.post(`/orders/admin/${id}/status/`, {
            status: 'offer_sent',
            comment: (comment !== null ? comment : (order.admin_comment || '')).trim(),
          });
          message.success(t('adminOrderDetail.offerSentSuccess'));
          fetchOrder();
        } catch (err) {
          message.error(extractApiError(err, t('adminOrderDetail.statusUpdateFailed')));
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  const handleCommentSave = async () => {
    try {
      const value = comment !== null ? comment : (order.admin_comment || '');
      await api.patch(`/orders/admin/${id}/`, { admin_comment: value });
      message.success(t('adminOrderDetail.commentSaved'));
      fetchOrder();
    } catch {
      message.error(t('adminOrderDetail.commentSaveFailed'));
    }
  };

  const openEditModal = () => {
    const rsPickups = order.route_stops?.pickups?.length ? order.route_stops.pickups : null;
    const rsDests = order.route_stops?.destinations?.length ? order.route_stops.destinations : null;
    const initialPickups = rsPickups
      ? rsPickups.map(p => ({ text: p.address || '', coords: p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null }))
      : [{ text: order.pickup_location || '', coords: order.pickup_lat && order.pickup_lng ? { lat: order.pickup_lat, lng: order.pickup_lng } : null }];
    const initialDests = rsDests
      ? rsDests.map(d => ({ text: d.address || '', coords: d.lat && d.lng ? { lat: d.lat, lng: d.lng } : null }))
      : (order.destination_location
        ? [{ text: order.destination_location, coords: order.destination_lat && order.destination_lng ? { lat: order.destination_lat, lng: order.destination_lng } : null }]
        : []);
    setEditPickupStops(initialPickups);
    setEditDestStops(initialDests);
    setEditDate(order.requested_date ? dayjs(order.requested_date) : null);
    setEditTime(order.requested_time ? dayjs(order.requested_time, 'HH:mm:ss') : null);
    setEditContactName(order.contact_name || '');
    setEditContactPhone(order.contact_phone || '');
    setEditDescription(order.description || '');
    setEditCargoDetails(order.cargo_details || '');
    setEditUrgency(order.urgency || 'normal');
    setEditActiveStop({ type: 'pickup', index: 0 });
    setEditModalOpen(true);
  };

  const updateEditStop = (kind, idx, patch) => {
    const setter = kind === 'pickup' ? setEditPickupStops : setEditDestStops;
    setter((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const addEditStop = (kind) => {
    const setter = kind === 'pickup' ? setEditPickupStops : setEditDestStops;
    setter((prev) => [...prev, { text: '', coords: null }]);
  };
  const removeEditStop = (kind, idx) => {
    const setter = kind === 'pickup' ? setEditPickupStops : setEditDestStops;
    setter((prev) => prev.filter((_, i) => i !== idx));
    // If the active map-target was the removed stop (or comes after it),
    // fall back to pickup #0 so the map keeps a sensible focus.
    if (editActiveStop.type === kind && editActiveStop.index >= idx) {
      setEditActiveStop({ type: 'pickup', index: 0 });
    }
  };

  const handleEditSave = async () => {
    const pickupsCleaned = editPickupStops.filter(s => (s.text || '').trim());
    const destsCleaned = editDestStops.filter(s => (s.text || '').trim());
    if (!pickupsCleaned.length) {
      message.error(t('adminOrderDetail.editPickupRequired'));
      return;
    }

    // Did the actual route geometry change? If admin only edited non-location
    // fields (date, contact, etc.), keep the existing distance/duration so a
    // transient OSRM outage doesn't wipe valid data. Otherwise recalculate.
    const stopKey = (stops) => stops
      .map((s) => `${s.lat ?? s.coords?.lat ?? ''},${s.lng ?? s.coords?.lng ?? ''}`)
      .join('|');
    const oldStops = [
      ...(order.route_stops?.pickups || []),
      ...(order.route_stops?.destinations || []),
    ];
    const newStops = [...pickupsCleaned, ...destsCleaned];
    const coordsChanged = stopKey(oldStops) !== stopKey(newStops);

    let distance = order.route_stops?.distance ?? null;
    let duration = order.route_stops?.duration ?? null;

    if (coordsChanged) {
      // Default to null on a real geometry change so we don't ship stale data
      // if OSRM fails or any stop is missing coordinates.
      distance = null;
      duration = null;
      const allHaveCoords = newStops.length >= 2 && newStops.every(
        (s) => Number.isFinite(s.coords?.lat) && Number.isFinite(s.coords?.lng),
      );
      if (allHaveCoords) {
        try {
          const coordsStr = newStops
            .map((s) => `${s.coords.lng},${s.coords.lat}`)
            .join(';');
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=false`,
          );
          const data = await res.json();
          if (data.code === 'Ok' && data.routes?.[0]) {
            distance = data.routes[0].distance;
            duration = data.routes[0].duration;
          }
        } catch {
          // Network/OSRM failure — leave distance null. Admin can re-save later.
        }
      }
    }

    const routeStops = {
      pickups: pickupsCleaned.map(s => ({ address: s.text, lat: s.coords?.lat ?? null, lng: s.coords?.lng ?? null })),
      destinations: destsCleaned.map(s => ({ address: s.text, lat: s.coords?.lat ?? null, lng: s.coords?.lng ?? null })),
      distance,
      duration,
    };
    const firstPickup = pickupsCleaned[0];
    const firstDest = destsCleaned[0];
    const payload = {
      pickup_location: firstPickup.text,
      pickup_lat: firstPickup.coords?.lat ?? null,
      pickup_lng: firstPickup.coords?.lng ?? null,
      destination_location: firstDest?.text || '',
      destination_lat: firstDest?.coords?.lat ?? null,
      destination_lng: firstDest?.coords?.lng ?? null,
      requested_date: editDate ? editDate.format('YYYY-MM-DD') : null,
      requested_time: editTime ? editTime.format('HH:mm:ss') : null,
      contact_name: editContactName,
      contact_phone: editContactPhone,
      description: editDescription,
      cargo_details: editCargoDetails,
      urgency: editUrgency,
      route_stops: JSON.stringify(routeStops),
    };
    try {
      setEditSaving(true);
      await api.patch(`/orders/admin/${id}/`, payload);
      message.success(t('adminOrderDetail.editSaved'));
      setEditModalOpen(false);
      await fetchOrder();
    } catch (err) {
      const detail = err.response?.data?.detail
        || (err.response?.data ? Object.values(err.response.data).flat().join(' ') : null)
        || t('adminOrderDetail.editFailed');
      message.error(detail);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );
  if (!order) return <Empty description={t('adminOrderDetail.orderNotFound')} />;

  const isMobile = !screens.md;
  // Two-column layout kicks in once we have ≥ 1200 px window width
  // (AntD's `xl` breakpoint, the closest to the requested ~1100 px).
  const isWide = screens.xl;
  const TERMINAL_STATUSES = ['completed', 'rejected', 'cancelled'];
  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  // With the new flow, `approved` means the customer has already accepted.
  const customerAccepted = ['approved', 'in_progress', 'completed'].includes(order.status);
  const awaitingAcceptance = order.status === 'offer_sent';
  const priceIsSet = order.price !== null && order.price !== undefined && Number(order.price) > 0;
  const priceDraftValid = priceDraft !== null && priceDraft !== undefined && priceDraft !== ''
    && Number.isFinite(Number(priceDraft)) && Number(priceDraft) > 0;
  // Admin hasn't sent the offer yet — "Send for Customer Approval" persists the
  // typed price itself, so a separate Save Price button would be redundant.
  const preOfferStatuses = ['new', 'under_review'];
  const showSavePriceButton = !preOfferStatuses.includes(order.status);
  const readyToSendOffer = (
    order.status === 'under_review'
    && (priceIsSet || priceDraftValid)
    && Boolean(order.assigned_vehicle)
    && Boolean(order.assigned_driver)
  );
  // Forward-only lifecycle — mirrors Order.STATUS_PROGRESSION on the backend.
  const STATUS_PROGRESSION = ['new', 'under_review', 'offer_sent', 'approved', 'in_progress', 'completed'];
  const currentProgressionIdx = STATUS_PROGRESSION.indexOf(order.status);

  // Multi-stop orders keep their full route in `route_stops`; the flat
  // pickup_/destination_ fields only hold the first stop for legacy/list use.
  const pickupStops = order.route_stops?.pickups?.length
    ? order.route_stops.pickups
    : (order.pickup_location ? [{ address: order.pickup_location, lat: order.pickup_lat, lng: order.pickup_lng }] : []);
  const destStops = order.route_stops?.destinations?.length
    ? order.route_stops.destinations
    : (order.destination_location ? [{ address: order.destination_location, lat: order.destination_lat, lng: order.destination_lng }] : []);
  const mapMarkers = [
    ...pickupStops.filter(s => s.lat && s.lng).map(s => ({ position: [s.lat, s.lng], color: 'green' })),
    ...destStops.filter(s => s.lat && s.lng).map(s => ({ position: [s.lat, s.lng], color: 'red' })),
  ];

  // ─── Quick-actions helpers ────────────────────────────────────────────
  const customerEmail = order.user_detail?.email || '';
  const customerPhone = order.contact_phone || order.user_detail?.phone_number || '';
  const pickupAddress = pickupStops[0]?.address || '';
  const formatStopForMaps = (s) => {
    if (!s) return null;
    if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) return `${s.lat},${s.lng}`;
    return s.address ? encodeURIComponent(s.address) : null;
  };
  const mapsUrl = (() => {
    const origin = formatStopForMaps(pickupStops[0]);
    if (!origin) return null;
    const dest = formatStopForMaps(destStops[0]);
    if (!dest) return `https://www.google.com/maps/search/?api=1&query=${origin}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
  })();
  const handleCopyPickup = async () => {
    if (!pickupAddress) return;
    try {
      await navigator.clipboard.writeText(pickupAddress);
      message.success(t('adminOrderDetail.pickupCopied'));
    } catch {
      message.error(t('adminOrderDetail.copyFailed'));
    }
  };
  const handleDownloadCsv = async () => {
    try {
      const resp = await api.get(`/orders/admin/${id}/export/`, { responseType: 'blob' });
      const disposition = resp.headers?.['content-disposition'] || '';
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const filename = match ? match[1] : `order_${id}.csv`;
      const url = window.URL.createObjectURL(resp.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error(t('adminOrders.exportFailed'));
    }
  };
  const goToCustomerOrders = () => {
    if (!order.user) return;
    const params = new URLSearchParams({ user_id: String(order.user) });
    const userName = order.user_detail?.full_name || order.contact_name || '';
    if (userName) params.set('user_name', userName);
    navigate(`/admin/orders?${params.toString()}`);
  };

  // ─── Next-step checklist ──────────────────────────────────────────────
  // Smooth-scroll a panel anchor into view; matches the IDs we set on the
  // assignment fields below so each unmet item is one click away.
  const scrollToAnchor = (anchorId) => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const finalServiceAssigned = Boolean(order.final_service);
  const checklistItems = [
    {
      key: 'service',
      done: finalServiceAssigned,
      label: t(finalServiceAssigned ? 'adminOrderDetail.checklistServiceDone' : 'adminOrderDetail.checklistServiceTodo'),
      anchor: 'admin-final-service',
    },
    {
      key: 'vehicle',
      done: Boolean(order.assigned_vehicle),
      label: t(order.assigned_vehicle ? 'adminOrderDetail.checklistVehicleDone' : 'adminOrderDetail.checklistVehicleTodo'),
      anchor: 'admin-assign-vehicle',
    },
    {
      key: 'driver',
      done: Boolean(order.assigned_driver),
      label: t(order.assigned_driver ? 'adminOrderDetail.checklistDriverDone' : 'adminOrderDetail.checklistDriverTodo'),
      anchor: 'admin-assign-driver',
    },
    {
      key: 'price',
      done: priceIsSet,
      label: t(priceIsSet ? 'adminOrderDetail.checklistPriceDone' : 'adminOrderDetail.checklistPriceTodo'),
      anchor: 'admin-set-price',
    },
  ];
  const NEXT_STEP_BY_STATUS = {
    new: 'adminOrderDetail.nextStepNew',
    under_review: 'adminOrderDetail.nextStepUnderReview',
    offer_sent: 'adminOrderDetail.nextStepOfferSent',
    approved: 'adminOrderDetail.nextStepApproved',
    in_progress: 'adminOrderDetail.nextStepInProgress',
    completed: 'adminOrderDetail.nextStepCompleted',
  };
  const nextStepLabel = NEXT_STEP_BY_STATUS[order.status]
    ? t(NEXT_STEP_BY_STATUS[order.status])
    : null;
  // Show checklist only while preparing the offer; once the offer is sent
  // (or the order is terminal), the right-column alerts already convey
  // the next admin action.
  const showChecklist = !isTerminal && (order.status === 'new' || order.status === 'under_review');

  // ─── In-modal map state derived from the live edit form ───
  const editActiveList = editActiveStop.type === 'pickup' ? editPickupStops : editDestStops;
  const editActiveStopData = editActiveList[editActiveStop.index];
  const editActiveLat = editActiveStopData?.coords?.lat;
  const editActiveLng = editActiveStopData?.coords?.lng;
  const editActivePosition = (Number.isFinite(editActiveLat) && Number.isFinite(editActiveLng))
    ? [editActiveLat, editActiveLng]
    : null;
  const editExtraMarkers = [
    ...editPickupStops.map((s, i) => ({ stop: s, type: 'pickup', index: i })),
    ...editDestStops.map((s, i) => ({ stop: s, type: 'dest', index: i })),
  ]
    .filter((m) => Number.isFinite(m.stop.coords?.lat) && Number.isFinite(m.stop.coords?.lng)
      && !(m.type === editActiveStop.type && m.index === editActiveStop.index))
    .map((m) => ({
      position: [m.stop.coords.lat, m.stop.coords.lng],
      color: m.type === 'dest' ? 'red' : 'green',
    }));
  const handleMapPickEdit = ({ lat, lng, address }) => {
    updateEditStop(editActiveStop.type, editActiveStop.index, {
      text: address,
      coords: { lat, lng },
    });
  };

  // Route distance / duration computed by OSRM at order-creation time and
  // stored alongside the stops in `route_stops`. We mirror the customer-side
  // formatting from NewOrderFlow (km / m, h+m / m).
  const routeDistanceMeters = order.route_stops?.distance ?? null;
  const routeDurationSeconds = order.route_stops?.duration ?? null;
  const formatDistance = (meters) => (
    meters >= 1000
      ? `${(meters / 1000).toFixed(1)} ${t('newOrder.km')}`
      : `${Math.round(meters)} m`
  );
  const formatDuration = (seconds) => {
    if (seconds >= 3600) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.round((seconds % 3600) / 60);
      return `${hrs} ${t('newOrder.hr')} ${mins} ${t('newOrder.min')}`;
    }
    return `${Math.round(seconds / 60)} ${t('newOrder.min')}`;
  };
  const statusOptionsForOrder = STATUS_OPTIONS
    // Cancellation is customer-only.
    .filter((opt) => opt.value !== 'cancelled' || order.status === 'cancelled')
    // "New" is the entry state.
    .filter((opt) => opt.value !== 'new' || order.status === 'new')
    // "Approved" is customer-only — admin uses "Send for Approval" to send the offer.
    .filter((opt) => opt.value !== 'approved' || order.status === 'approved')
    .map((opt) => {
      // Backward moves along the progression are blocked server-side.
      const targetIdx = STATUS_PROGRESSION.indexOf(opt.value);
      if (
        currentProgressionIdx >= 0
        && targetIdx >= 0
        && targetIdx < currentProgressionIdx
      ) {
        return { ...opt, disabled: true };
      }
      if (opt.value === 'in_progress' && !customerAccepted && order.status !== 'in_progress') {
        return { ...opt, disabled: true };
      }
      if (opt.value === 'offer_sent' && !priceIsSet && order.status !== 'offer_sent') {
        return { ...opt, disabled: true };
      }
      // Completion requires the job to be in progress first.
      if (opt.value === 'completed' && order.status !== 'in_progress' && order.status !== 'completed') {
        return { ...opt, disabled: true };
      }
      return opt;
    });

  const sectionStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  };

  const sectionHeaderStyle = {
    padding: isMobile ? '14px 16px' : '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };

  const sectionTitleStyle = {
    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
    letterSpacing: '-0.02em', margin: 0,
  };

  // Fixed-bottom CTA only shown while the offer hasn't been sent yet — see
  // bar implementation just before the page closes. Reserve room for it so
  // the last section doesn't hide behind the bar.
  const showSendOfferBar = !isTerminal && (order.status === 'new' || order.status === 'under_review');

  // Extracted so the same JSX can render in either column of the flex layout
  // (between Order Info and Map on narrow viewports, or in the right column
  // on wide viewports) without duplicating ~470 lines of markup.
  const adminActionsSection = (
    <div style={{ ...sectionStyle, marginBottom: 0 }}>
      <div style={sectionHeaderStyle}>
        <SettingOutlined style={{ color: '#8b5cf6', fontSize: 15 }} />
        <Text style={sectionTitleStyle}>{t('adminOrderDetail.adminActions')}</Text>
      </div>
      <div style={{ padding: isMobile ? 16 : 24 }}>
        {isTerminal && (
          <Alert
            type="info"
            showIcon
            message={t('adminOrderDetail.lockedTitle')}
            description={t('adminOrderDetail.lockedDescription', {
              status: t(`status.${order.status}`),
            })}
            style={{ borderRadius: 10, marginBottom: 20 }}
          />
        )}
        {awaitingAcceptance && (
          <Alert
            type="warning"
            showIcon
            message={t('adminOrderDetail.offerSentTitle')}
            description={t('adminOrderDetail.offerSentDescription')}
            style={{ borderRadius: 10, marginBottom: 20 }}
          />
        )}

        {/* When customer has accepted, highlight the next logical step */}
        {order.status === 'approved' && (
          <div style={{
            background: 'linear-gradient(135deg, #10b98114 0%, #10b98120 100%)',
            borderRadius: 14, padding: isMobile ? '14px 16px' : '16px 20px',
            border: '1px solid #10b98140',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <CheckCircleOutlined style={{ color: '#10b981', fontSize: 22, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                letterSpacing: -0.1,
              }}>
                {t('adminOrderDetail.customerAccepted')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {order.customer_accepted_at && t('adminOrderDetail.customerAcceptedAt', {
                  date: new Date(order.customer_accepted_at).toLocaleString(),
                })}
              </div>
            </div>
          </div>
        )}

        {/* Assign Service */}
        <div id="admin-final-service" style={{ marginBottom: 24, scrollMarginTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TagOutlined style={{ color: 'var(--accent)', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.assignService')}
            </Text>
          </div>
          <Select
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 340 }}
            size={isMobile ? 'large' : 'middle'}
            value={order.final_service || undefined}
            placeholder={t('adminOrderDetail.selectFinalService')}
            onChange={handleCategoryChange}
            disabled={isTerminal}
            options={categories.map((c) => ({ value: c.id, label: localized(c.name) }))}
          />
        </div>

        <Divider style={{ borderColor: 'var(--border-color)' }} />

        {/* Assign Vehicle */}
        <div id="admin-assign-vehicle" style={{ marginBottom: 24, scrollMarginTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CarOutlined style={{ color: 'var(--accent)', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.assignVehicle')}
            </Text>
          </div>
          <Select
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 340 }}
            size={isMobile ? 'large' : 'middle'}
            value={order.assigned_vehicle || undefined}
            placeholder={t('adminOrderDetail.selectVehicle')}
            allowClear
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            onChange={handleVehicleAssign}
            disabled={isTerminal}
            options={vehicleOptions}
          />
          {order.assigned_vehicle_detail && (
            <div style={{
              marginTop: 10, padding: '12px 14px',
              background: 'var(--accent-bg)', borderRadius: 12,
              border: '1px solid var(--accent-bg-strong)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'var(--accent-bg-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontSize: 18, flexShrink: 0,
                }}>
                  <CarOutlined />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {order.assigned_vehicle_detail.name}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2,
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  }}>
                    {order.assigned_vehicle_detail.plate_number && (
                      <span>
                        {t('orders.plate')}:{' '}
                        <span style={{
                          fontFamily: 'monospace', fontWeight: 700,
                          color: 'var(--text-secondary)', letterSpacing: 0.5,
                        }}>
                          {order.assigned_vehicle_detail.plate_number}
                        </span>
                      </span>
                    )}
                    {order.assigned_vehicle_detail.price_per_hour && (
                      <span>{currency.symbol}{order.assigned_vehicle_detail.price_per_hour}/hr</span>
                    )}
                    {order.assigned_vehicle_detail.status_display && (
                      <Tag style={{ margin: 0 }}>{order.assigned_vehicle_detail.status_display}</Tag>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const seen = new Set();
                const imgs = [];
                if (order.assigned_vehicle_detail.image) {
                  imgs.push(order.assigned_vehicle_detail.image);
                  seen.add(order.assigned_vehicle_detail.image);
                }
                if (Array.isArray(order.assigned_vehicle_detail.images)) {
                  order.assigned_vehicle_detail.images.forEach((img) => {
                    if (img?.image && !seen.has(img.image)) {
                      imgs.push(img.image);
                      seen.add(img.image);
                    }
                  });
                }
                if (!imgs.length) return null;
                return (
                  <div style={{ marginTop: 10 }}>
                    <Image.PreviewGroup>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {imgs.map((src, i) => (
                          <Image
                            key={i} width={72} height={72} src={src}
                            style={{ objectFit: 'cover', borderRadius: 10 }}
                          />
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <Divider style={{ borderColor: 'var(--border-color)' }} />

        {/* Assign Driver */}
        <div id="admin-assign-driver" style={{ marginBottom: 24, scrollMarginTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <UserOutlined style={{ color: 'var(--accent)', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.assignDriver')}
            </Text>
          </div>
          {!order.assigned_vehicle ? (
            <Alert
              type="info"
              showIcon
              message={t('adminOrderDetail.assignVehicleFirst')}
              style={{ borderRadius: 10 }}
            />
          ) : (
            <>
              <Select
                style={{ width: '100%', maxWidth: isMobile ? '100%' : 340 }}
                size={isMobile ? 'large' : 'middle'}
                value={order.assigned_driver || undefined}
                placeholder={t('adminOrderDetail.selectDriver')}
                allowClear
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                onChange={handleDriverAssign}
                disabled={isTerminal}
                options={eligibleDrivers.map((d) => ({
                  value: d.id,
                  label: `${d.full_name} — ${d.license_number}${d.is_busy ? ' · busy' : ''}`,
                }))}
                notFoundContent={t('adminOrderDetail.noEligibleDrivers')}
              />
              {order.assigned_driver_detail && (
                <div style={{
                  marginTop: 10, padding: '12px 14px',
                  background: 'var(--accent-bg)', borderRadius: 12,
                  border: '1px solid var(--accent-bg-strong)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  {order.assigned_driver_detail.photo ? (
                    <img
                      src={order.assigned_driver_detail.photo}
                      alt={order.assigned_driver_detail.full_name}
                      style={{
                        width: 52, height: 52, borderRadius: '50%',
                        objectFit: 'cover', flexShrink: 0,
                        border: '2px solid var(--card-bg)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'var(--accent-bg-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)', fontSize: 20, flexShrink: 0,
                    }}>
                      <UserOutlined />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {order.assigned_driver_detail.full_name}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4,
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    }}>
                      {order.assigned_driver_detail.phone && (
                        <a
                          href={`tel:${order.assigned_driver_detail.phone}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            color: 'var(--accent)', fontWeight: 600, textDecoration: 'none',
                          }}
                        >
                          <PhoneOutlined style={{ fontSize: 11 }} />
                          {order.assigned_driver_detail.phone}
                        </a>
                      )}
                      {order.assigned_driver_detail.license_number && (
                        <span>· {order.assigned_driver_detail.license_number}</span>
                      )}
                      {order.assigned_driver_detail.license_categories && (
                        <Tag style={{ margin: 0 }}>{order.assigned_driver_detail.license_categories}</Tag>
                      )}
                      {order.assigned_driver_detail.status_display && (
                        <Tag style={{ margin: 0 }}>{order.assigned_driver_detail.status_display}</Tag>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Divider style={{ borderColor: 'var(--border-color)' }} />

        {/* Scheduled Window */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ClockCircleOutlined style={{ color: 'var(--accent)', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.scheduledWindow')}
            </Text>
          </div>
          <DatePicker.RangePicker
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 420, borderRadius: 10 }}
            size={isMobile ? 'large' : 'middle'}
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            value={[
              order.scheduled_from ? dayjs(order.scheduled_from) : null,
              order.scheduled_to ? dayjs(order.scheduled_to) : null,
            ]}
            onChange={handleScheduleChange}
            disabled={isTerminal}
          />
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            {t('adminOrderDetail.scheduleHint')}
          </div>
        </div>

        <Divider style={{ borderColor: 'var(--border-color)' }} />

        {/* Set Price */}
        <div id="admin-set-price" style={{ marginBottom: 24, scrollMarginTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <DollarOutlined style={{ color: '#10b981', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.setPrice')}
            </Text>
            {order.status === 'new' || order.status === 'under_review' ? (
              <Tag color="orange" style={{ margin: 0, borderRadius: 6 }}>
                {t('adminOrderDetail.priceRequiredTag')}
              </Tag>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <InputNumber
              style={{ width: isMobile ? '100%' : 200 }}
              size={isMobile ? 'large' : 'middle'}
              value={priceDraft ?? undefined}
              onChange={(val) => setPriceDraft(val === null || val === undefined ? null : Math.round(Number(val)))}
              min={0}
              step={10}
              precision={0}
              disabled={isTerminal}
              placeholder={t('adminOrderDetail.priceInputPlaceholder')}
              prefix={<span style={{ color: 'var(--text-tertiary)' }}>{currency.symbol}</span>}
            />
            {showSavePriceButton && (
              <Button
                onClick={handlePriceSave}
                disabled={isTerminal}
                size={isMobile ? 'large' : 'middle'}
                style={{
                  borderRadius: 10, fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  ...(isMobile ? { width: '100%', height: 44 } : {}),
                }}
              >
                {t('adminOrderDetail.savePrice')}
              </Button>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
            {showSavePriceButton ? t('adminOrderDetail.priceHint') : t('adminOrderDetail.priceHintPreOffer')}
          </div>
        </div>

        <Divider style={{ borderColor: 'var(--border-color)' }} />

        {/* Set Priority */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.setPriority')}
            </Text>
          </div>
          <Select
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 340 }}
            size={isMobile ? 'large' : 'middle'}
            value={order.urgency}
            onChange={handleUrgencyChange}
            disabled={isTerminal}
            options={[
              { value: 'low', label: t('urgency.low') },
              { value: 'normal', label: t('urgency.normal') },
              { value: 'high', label: t('urgency.high') },
              { value: 'urgent', label: t('urgency.urgent') },
            ]}
          />
        </div>

        <Divider style={{ borderColor: 'var(--border-color)' }} />

        {/* Change Status */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <SyncOutlined style={{ color: '#06b6d4', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.changeStatus')}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Select
              style={{ width: isMobile ? '100%' : 200 }}
              size={isMobile ? 'large' : 'middle'}
              value={newStatus}
              onChange={setNewStatus}
              disabled={isTerminal}
              options={statusOptionsForOrder}
            />
            <Button
              type="primary"
              loading={updating}
              onClick={handleStatusChange}
              disabled={isTerminal}
              size={isMobile ? 'large' : 'middle'}
              style={{
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
                borderRadius: 10,
                fontWeight: 600,
                ...(isMobile ? { width: '100%', height: 44 } : {}),
              }}
            >
              {t('adminOrderDetail.updateStatus')}
            </Button>
          </div>
          {awaitingAcceptance && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              {t('adminOrderDetail.inProgressLockedHint')}
            </div>
          )}
        </div>

        <Divider style={{ borderColor: 'var(--border-color)' }} />

        {/* Admin Comment */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CommentOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
            <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {t('adminOrderDetail.adminCommentLabel')}
            </Text>
            {newStatus === 'rejected' && (
              <Tag color="red" style={{ margin: 0, borderRadius: 6 }}>
                {t('adminOrderDetail.required')}
              </Tag>
            )}
          </div>
          {newStatus === 'rejected' && (
            <Alert
              type="warning"
              showIcon
              message={t('adminOrderDetail.rejectCommentRequired')}
              style={{ borderRadius: 10, marginBottom: 10 }}
            />
          )}
          <TextArea
            rows={3}
            value={comment !== null ? comment : (order.admin_comment || '')}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('adminOrderDetail.addComment')}
            status={newStatus === 'rejected' && !(comment !== null ? comment : (order.admin_comment || '')).trim() ? 'error' : undefined}
            disabled={isTerminal}
            style={{ borderRadius: 10 }}
          />
          <Button
            onClick={handleCommentSave}
            disabled={isTerminal}
            style={{
              marginTop: 10, borderRadius: 10,
              fontWeight: 600, border: '1px solid var(--border-color)',
            }}
          >
            {t('adminOrderDetail.saveComment')}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        maxWidth: isWide ? 1280 : 920,
        margin: '0 auto',
        paddingBottom: showSendOfferBar ? (isMobile ? 200 : 120) : 0,
      }}
      className="page-enter"
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 16 : 24, flexWrap: 'wrap',
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/orders')}
          size={isMobile ? 'large' : 'middle'}
          style={{ borderRadius: 10, border: '1px solid var(--border-color)' }}
        >
          {isMobile ? '' : t('common.back')}
        </Button>
        <Title level={isMobile ? 4 : 3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)', flex: isMobile ? 1 : 'initial', minWidth: 0,
        }}>
          {t('orders.orderDetail', { id: order.id })}
        </Title>
        <StatusBadge status={order.status} />
      </div>

      {/* Summary strip — surfaces the most-glanced facts (left) and the
          quick-action shortcuts (right). Wraps to two rows on narrow
          viewports so the actions stay tappable. */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 16 : 24,
        padding: isMobile ? '10px 14px' : '12px 18px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        fontSize: 13,
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: isMobile ? 8 : 12, minWidth: 0,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <UserOutlined style={{ color: 'var(--text-tertiary)' }} />
            <span style={{
              fontWeight: 600, color: 'var(--text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {order.user_detail?.full_name || order.contact_name || '—'}
            </span>
          </div>
          <span style={{ color: 'var(--text-tertiary)' }}>·</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ClockCircleOutlined style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ color: 'var(--text-primary)' }}>
              {order.requested_date || '—'}
              {order.requested_time && (
                <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>
                  {String(order.requested_time).slice(0, 5)}
                </span>
              )}
            </span>
          </div>
          <span style={{ color: 'var(--text-tertiary)' }}>·</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <DollarOutlined style={{ color: 'var(--text-tertiary)' }} />
            <span style={{
              fontWeight: 600,
              color: priceIsSet ? 'var(--accent)' : 'var(--text-tertiary)',
            }}>
              {priceIsSet
                ? `${currency.symbol}${Number(order.price).toLocaleString()}`
                : '—'}
            </span>
          </div>
        </div>
        <Space size={2} wrap>
          {customerPhone && (
            <Tooltip title={t('adminOrderDetail.callCustomer')}>
              <Button
                type="text"
                size="small"
                icon={<PhoneOutlined />}
                href={`tel:${customerPhone}`}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Tooltip>
          )}
          {pickupAddress && (
            <Tooltip title={t('adminOrderDetail.copyPickup')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyPickup}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Tooltip>
          )}
          {mapsUrl && (
            <Tooltip title={t('adminOrderDetail.openInMaps')}>
              <Button
                type="text"
                size="small"
                icon={<EnvironmentOutlined />}
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-secondary)' }}
              />
            </Tooltip>
          )}
          {customerEmail && (
            <Tooltip title={t('adminOrderDetail.emailCustomer')}>
              <Button
                type="text"
                size="small"
                icon={<MailOutlined />}
                href={`mailto:${customerEmail}`}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Tooltip>
          )}
          {order.user && (
            <Tooltip title={t('adminOrderDetail.viewCustomerOrders')}>
              <Button
                type="text"
                size="small"
                icon={<TeamOutlined />}
                onClick={goToCustomerOrders}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Tooltip>
          )}
          <Tooltip title={t('adminOrderDetail.downloadCsv')}>
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownloadCsv}
              style={{ color: 'var(--text-secondary)' }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Next-step checklist — replaces "scroll-and-hunt" with a single
          glance: what's the next action, and which fields still block it.
          Each missing item is clickable and scrolls to the matching input
          in the admin actions panel. Hidden once the offer is sent (the
          right-column alerts take over from there) and on terminal states. */}
      {showChecklist && nextStepLabel && (
        <div style={{
          marginBottom: isMobile ? 16 : 24,
          padding: isMobile ? '14px 16px' : '16px 20px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderLeft: `4px solid ${readyToSendOffer ? 'var(--accent)' : '#f59e0b'}`,
          borderRadius: 12,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {t('adminOrderDetail.nextStep')}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {nextStepLabel}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {checklistItems.map((item) => {
              const Wrapper = item.done ? 'div' : 'button';
              const wrapperProps = item.done
                ? {}
                : {
                  type: 'button',
                  onClick: () => scrollToAnchor(item.anchor),
                };
              return (
                <Wrapper
                  key={item.key}
                  {...wrapperProps}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    cursor: item.done ? 'default' : 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                    fontSize: 13,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={item.done ? undefined : (e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={item.done ? undefined : (e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.done
                    ? <CheckCircleOutlined style={{ color: '#10b981', fontSize: 15 }} />
                    : <ExclamationCircleFilled style={{ color: '#f59e0b', fontSize: 15 }} />}
                  <span style={{
                    flex: 1,
                    color: item.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    textDecoration: item.done ? 'line-through' : 'none',
                    fontWeight: item.done ? 400 : 600,
                  }}>
                    {item.label}
                  </span>
                  {!item.done && <RightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 11 }} />}
                </Wrapper>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column section layout on wide screens. Outer flex stacks the
          left column (Order Info + Map + Images + History) next to the right
          column (Admin Actions). Each column sizes to its own content so the
          page scroll matches `max(left, right)` — no extra empty scroll past
          content. On narrow viewports the layout collapses to a single
          column and Admin Actions renders in JSX order via the `!isWide`
          guard inside the left column. */}
      <div style={{
        display: 'flex',
        flexDirection: isWide ? 'row' : 'column',
        alignItems: 'flex-start',
        gap: 20,
      }}>
      {/* Left column */}
      <div style={{
        flex: 1,
        minWidth: 0,
        width: isWide ? undefined : '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>

      {/* Order Info */}
      <div style={{
        ...sectionStyle,
        marginBottom: 0,
        ...(isWide ? { gridColumn: 1 } : {}),
      }}>
        <div style={{ ...sectionHeaderStyle, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <InfoCircleOutlined style={{ color: '#3b82f6', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>{t('adminOrderDetail.orderInfo')}</Text>
            {order.admin_edited_at && (
              <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>
                {t('adminOrderDetail.editedByAdminTag')}
              </Tag>
            )}
          </div>
          {!isTerminal && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={openEditModal}
              style={{ borderRadius: 8 }}
            >
              {t('adminOrderDetail.editDetails')}
            </Button>
          )}
        </div>
        <div style={{ padding: isMobile ? 16 : 24 }}>

          {/* Customer */}
          <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              <UserOutlined style={{ color: '#3b82f6', fontSize: 13 }} />
              {t('adminOrderDetail.customer')}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>
                {(order.user_detail?.full_name || '?').slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                  {order.user_detail?.full_name || '—'}
                </div>
                {order.user_detail?.email && (
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {order.user_detail.email}
                  </div>
                )}
                {((order.contact_name && order.contact_name !== order.user_detail?.full_name) || order.contact_phone) && (
                  <div style={{
                    marginTop: 10, paddingTop: 10,
                    borderTop: '1px dashed var(--border-color)',
                    display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13,
                  }}>
                    {order.contact_name && order.contact_name !== order.user_detail?.full_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <UserOutlined style={{ color: 'var(--text-tertiary)', fontSize: 12 }} />
                        <span style={{ color: 'var(--text-tertiary)' }}>{t('orders.contact')}:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.contact_name}</span>
                      </div>
                    )}
                    {order.contact_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PhoneOutlined style={{ color: 'var(--text-tertiary)', fontSize: 12 }} />
                        <a href={`tel:${order.contact_phone}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>
                          {order.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service */}
          <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}>
              <TagOutlined style={{ color: 'var(--accent)', fontSize: 13 }} />
              {t('adminOrders.service')}
            </div>
            <div style={{ fontSize: 15 }}>
              {(() => {
                const finalName = localized(order.final_service_detail?.name || order.final_category_detail?.name);
                const selectedName = localized(order.selected_service_detail?.name || order.selected_category_detail?.name);
                const suggestedName = localized(order.suggested_service_detail?.name || order.suggested_category_detail?.name);
                const primary = finalName || selectedName;
                if (!primary) return '—';
                const showOverride = finalName && selectedName && finalName !== selectedName;
                const showSuggested = suggestedName
                  && suggestedName !== finalName
                  && suggestedName !== selectedName;
                return (
                  <>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{primary}</span>
                    {showOverride && (
                      <span style={{ color: 'var(--text-tertiary)' }}>{' → '}{selectedName}</span>
                    )}
                    {showSuggested && (
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {t('newOrder.suggested')} {suggestedName}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Route */}
          <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
            }}>
              <EnvironmentOutlined style={{ color: '#10b981', fontSize: 13 }} />
              {t('newOrder.route')}
            </div>

            <div style={{
              position: 'relative', paddingLeft: 22,
              marginBottom: destStops.length ? 16 : 0,
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 5, width: 12, height: 12,
                borderRadius: '50%', background: '#10b981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.18)',
              }} />
              {destStops.length > 0 && (
                <div style={{
                  position: 'absolute', left: 5, top: 19, bottom: -16,
                  width: 2, background: 'var(--border-color)',
                }} />
              )}
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {t('orders.pickup')}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                {pickupStops.length > 1 ? (
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {pickupStops.map((s, i) => <li key={i}>{s.address || '—'}</li>)}
                  </ol>
                ) : (pickupStops[0]?.address || '—')}
              </div>
            </div>

            {destStops.length > 0 && (
              <div style={{ position: 'relative', paddingLeft: 22 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 5, width: 12, height: 12,
                  borderRadius: '50%', background: '#ef4444',
                  boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.18)',
                }} />
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {t('orders.destination')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {destStops.length > 1 ? (
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                      {destStops.map((s, i) => <li key={i}>{s.address || '—'}</li>)}
                    </ol>
                  ) : (destStops[0]?.address)}
                </div>
              </div>
            )}

            {routeDistanceMeters != null && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'var(--bg-secondary)', borderRadius: 10,
                display: 'inline-flex', alignItems: 'center', gap: 10,
                fontSize: 13,
              }}>
                <span style={{
                  color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {t('newOrder.routeDistance')}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatDistance(routeDistanceMeters)}
                </span>
                {routeDurationSeconds != null && (
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    · ~ {formatDuration(routeDurationSeconds)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
            }}>
              <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: 13 }} />
              {t('adminOrderDetail.schedule')}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
            }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                <div style={{
                  fontSize: 11, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
                }}>
                  {t('orders.date')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {order.requested_date || '—'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                <div style={{
                  fontSize: 11, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
                }}>
                  {t('orders.time')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {order.requested_time ? String(order.requested_time).slice(0, 5) : '—'}
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                <div style={{
                  fontSize: 11, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
                }}>
                  {t('adminOrders.urgencyLabel')}
                </div>
                <UrgencyBadge urgency={order.urgency} />
              </div>
            </div>
          </div>

          {/* Details (description / cargo / user note) */}
          {(order.description || order.cargo_details || order.user_note) && (
            <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
              }}>
                <CommentOutlined style={{ color: '#8b5cf6', fontSize: 13 }} />
                {t('adminOrderDetail.details')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {order.description && (
                  <div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
                    }}>
                      {t('orders.description')}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {order.description}
                    </div>
                  </div>
                )}
                {order.cargo_details && (
                  <div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
                    }}>
                      {t('newOrder.cargoDetails')}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {order.cargo_details}
                    </div>
                  </div>
                )}
                {order.user_note && (
                  <div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
                    }}>
                      {t('newOrder.notes')}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {order.user_note}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps footer */}
          <div style={{
            paddingTop: 16, fontSize: 11, color: 'var(--text-tertiary)',
            display: 'flex', flexWrap: 'wrap', gap: 14,
          }}>
            <span>{t('adminOrderDetail.created')}: {new Date(order.created_at).toLocaleString()}</span>
            <span>·</span>
            <span>{t('adminOrderDetail.updated')}: {new Date(order.updated_at).toLocaleString()}</span>
          </div>

        </div>
      </div>

      {!isWide && adminActionsSection}

      {/* Map */}
      {mapMarkers.length > 0 && (
        <div style={{
          ...sectionStyle,
          marginBottom: 0,
          ...(isWide ? { gridColumn: 1 } : {}),
        }}>
          <div style={sectionHeaderStyle}>
            <EnvironmentOutlined style={{ color: '#10b981', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>{t('adminOrderDetail.locationMap')}</Text>
          </div>
          <div style={{ padding: 0 }}>
            <MapView
              height={260}
              markers={mapMarkers}
            />
          </div>
        </div>
      )}

      {/* Images */}
      {order.images?.length > 0 && (
        <div style={{
          ...sectionStyle,
          marginBottom: 0,
          ...(isWide ? { gridColumn: 1 } : {}),
        }}>
          <div style={sectionHeaderStyle}>
            <PictureOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>{t('adminOrderDetail.uploadedImages')}</Text>
          </div>
          <div style={{ padding: isMobile ? 16 : 24 }}>
            <Image.PreviewGroup>
              <Space wrap size={12}>
                {order.images.map((img) => (
                  <Image
                    key={img.id}
                    width={120}
                    height={120}
                    src={img.image}
                    style={{ objectFit: 'cover', borderRadius: 12 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          </div>
        </div>
      )}

      {/* Status History */}
      {order.status_history?.length > 0 && (
        <div style={{
          ...sectionStyle,
          marginBottom: 0,
          ...(isWide ? { gridColumn: 1 } : {}),
        }}>
          <div style={sectionHeaderStyle}>
            <HistoryOutlined style={{ color: '#06b6d4', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>{t('orders.statusHistory')}</Text>
          </div>
          <div style={{ padding: isMobile ? 16 : 24 }}>
            <Timeline
              items={order.status_history.map((h) => ({
                color: STATUS_CONFIG[h.new_status]?.color || 'gray',
                children: (
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      <StatusBadge status={h.new_status} />
                      {h.old_status && (
                        <Text style={{
                          color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 6,
                        }}>
                          {t('status.' + h.old_status)}
                        </Text>
                      )}
                    </div>
                    {h.changed_by_name && (
                      <Text style={{ color: 'var(--text-secondary)', fontSize: 12, display: 'block' }}>
                        {h.changed_by_name}
                      </Text>
                    )}
                    {h.comment && (
                      <div style={{
                        padding: '6px 10px', background: 'var(--bg-secondary)',
                        borderRadius: 8, marginTop: 4, fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}>
                        {h.comment}
                      </div>
                    )}
                    <Text style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 4, display: 'block' }}>
                      {new Date(h.created_at).toLocaleString()}
                    </Text>
                  </div>
                ),
              }))}
            />
          </div>
        </div>
      )}

      </div>{/* /left column */}

      {isWide && (
        <div style={{ width: 380, flexShrink: 0 }}>
          {adminActionsSection}
        </div>
      )}

      </div>{/* /outer flex */}

      {/* Edit Details Modal */}
      <Modal
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEditSave}
        // Defer the map mount until the open animation finishes; tear it
        // down again on close so it remounts fresh next time.
        afterOpenChange={(open) => setEditMapReady(open)}
        title={t('adminOrderDetail.editDetails')}
        okText={t('adminOrderDetail.saveEdits')}
        cancelText={t('common.cancel')}
        confirmLoading={editSaving}
        width={isMobile ? '100%' : 680}
        // Cap body height so the embedded map doesn't push the OK/Cancel
        // footer below the fold. Title + footer stay anchored.
        styles={{ body: { maxHeight: 'calc(85vh - 110px)', overflowY: 'auto', paddingRight: 8 } }}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Pickups */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('newOrder.pickupFrom')}
            </Text>
            {editPickupStops.map((stop, idx) => {
              const isActive = editActiveStop.type === 'pickup' && editActiveStop.index === idx;
              return (
                <div
                  key={`edit-pickup-${idx}`}
                  onClick={() => setEditActiveStop({ type: 'pickup', index: idx })}
                  style={{
                    display: 'flex', gap: 8, marginBottom: 8,
                    padding: 4, borderRadius: 10,
                    background: isActive ? 'var(--accent-bg)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <LocationAutocomplete
                    value={stop.text}
                    onChange={(val) => updateEditStop('pickup', idx, { text: val })}
                    onSelect={({ address, lat, lng }) => updateEditStop('pickup', idx, { text: address, coords: { lat, lng } })}
                    placeholder={editPickupStops.length > 1 ? `${t('newOrder.pickupFrom')} #${idx + 1}` : t('newOrder.pickupFrom')}
                    countryCode="ge"
                    style={{ flex: 1 }}
                  />
                  {editPickupStops.length > 1 && (
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={(e) => { e.stopPropagation(); removeEditStop('pickup', idx); }}
                      danger
                    />
                  )}
                </div>
              );
            })}
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => addEditStop('pickup')}
              type="dashed"
              block
            >
              {t('newOrder.addPickupStop')}
            </Button>
          </div>

          {/* Destinations */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('orders.destination')}
            </Text>
            {editDestStops.map((stop, idx) => {
              const isActive = editActiveStop.type === 'dest' && editActiveStop.index === idx;
              return (
                <div
                  key={`edit-dest-${idx}`}
                  onClick={() => setEditActiveStop({ type: 'dest', index: idx })}
                  style={{
                    display: 'flex', gap: 8, marginBottom: 8,
                    padding: 4, borderRadius: 10,
                    background: isActive ? '#ef44441a' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <LocationAutocomplete
                    value={stop.text}
                    onChange={(val) => updateEditStop('dest', idx, { text: val })}
                    onSelect={({ address, lat, lng }) => updateEditStop('dest', idx, { text: address, coords: { lat, lng } })}
                    placeholder={editDestStops.length > 1 ? `${t('orders.destination')} #${idx + 1}` : t('orders.destination')}
                    countryCode="ge"
                    style={{ flex: 1 }}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={(e) => { e.stopPropagation(); removeEditStop('dest', idx); }}
                    danger
                  />
                </div>
              );
            })}
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => addEditStop('dest')}
              type="dashed"
              block
            >
              {t('newOrder.addDestStop')}
            </Button>
          </div>

          {/* Map picker — admins can drop a pin on the map for the active stop.
              Tabs above the map switch which stop the next click updates. */}
          {(editPickupStops.length > 0 || editDestStops.length > 0) && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                {t('adminOrderDetail.locationMap')}
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {editPickupStops.map((_, idx) => {
                  const isActive = editActiveStop.type === 'pickup' && editActiveStop.index === idx;
                  return (
                    <button
                      key={`edit-pickup-tab-${idx}`}
                      type="button"
                      onClick={() => setEditActiveStop({ type: 'pickup', index: idx })}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: isActive ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <EnvironmentOutlined style={{ marginRight: 4, fontSize: 11 }} />
                      {editPickupStops.length > 1
                        ? `${t('newOrder.pickupMap')} ${idx + 1}`
                        : t('newOrder.pickupMap')}
                    </button>
                  );
                })}
                {editDestStops.map((_, idx) => {
                  const isActive = editActiveStop.type === 'dest' && editActiveStop.index === idx;
                  return (
                    <button
                      key={`edit-dest-tab-${idx}`}
                      type="button"
                      onClick={() => setEditActiveStop({ type: 'dest', index: idx })}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: isActive ? '#ef4444' : 'var(--bg-tertiary)',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <EnvironmentOutlined style={{ marginRight: 4, fontSize: 11 }} />
                      {editDestStops.length > 1
                        ? `${t('newOrder.destinationMap')} ${idx + 1}`
                        : t('newOrder.destinationMap')}
                    </button>
                  );
                })}
              </div>
              {editMapReady ? (
                <MapPicker
                  position={editActivePosition}
                  onSelect={handleMapPickEdit}
                  height={isMobile ? 240 : 320}
                  markerColor={editActiveStop.type === 'dest' ? 'red' : 'green'}
                  placeholder={editActiveStop.type === 'dest'
                    ? t('newOrder.tapDestination')
                    : t('newOrder.tapPickup')}
                  extraMarkers={editExtraMarkers}
                />
              ) : (
                // Map placeholder during the modal's open animation.
                <div style={{
                  height: isMobile ? 240 : 320,
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                }} />
              )}
            </div>
          )}

          {/* Date + Time */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {t('adminOrderDetail.requestedDate')}
              </Text>
              <DatePicker
                value={editDate}
                onChange={setEditDate}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {t('orders.time')}
              </Text>
              <TimePicker
                value={editTime}
                onChange={setEditTime}
                style={{ width: '100%' }}
                format="HH:mm"
              />
            </div>
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {t('orders.contact')}
              </Text>
              <Input value={editContactName} onChange={(e) => setEditContactName(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <Text style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {t('auth.phone')}
              </Text>
              <Input value={editContactPhone} onChange={(e) => setEditContactPhone(e.target.value)} />
            </div>
          </div>

          {/* Urgency */}
          <div>
            <Text style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {t('adminOrders.urgencyLabel')}
            </Text>
            <Select
              value={editUrgency}
              onChange={setEditUrgency}
              style={{ width: '100%' }}
              options={[
                { value: 'low', label: t('urgency.low') },
                { value: 'normal', label: t('urgency.normal') },
                { value: 'high', label: t('urgency.high') },
                { value: 'urgent', label: t('urgency.urgent') },
              ]}
            />
          </div>

          {/* Description */}
          <div>
            <Text style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {t('orders.description')}
            </Text>
            <TextArea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
          </div>

          {/* Cargo details */}
          <div>
            <Text style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {t('newOrder.cargoDetails')}
            </Text>
            <TextArea value={editCargoDetails} onChange={(e) => setEditCargoDetails(e.target.value)} rows={2} />
          </div>
        </div>
      </Modal>

      {/* ── Fixed-bottom Send-for-Customer-Approval CTA ──
          Always reachable while reviewing/pricing the order, so admins can
          set the price (further down the page) and submit without scrolling
          back up. The CSS variable --admin-sidebar-width is exposed by
          AdminLayout on desktop so the bar starts to the right of the
          sidebar; mobile leaves the variable unset so it falls back to 0,
          and we offset 62px for the mobile tab bar at the very bottom. */}
      {showSendOfferBar && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 62 : 0,
          left: 'var(--admin-sidebar-width, 0px)',
          right: 0,
          zIndex: 99,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{
            margin: '0 auto', maxWidth: 920,
            padding: isMobile ? '14px 16px' : '18px 28px',
            paddingBottom: isMobile
              ? 'calc(14px + env(safe-area-inset-bottom, 0px))'
              : 'calc(18px + env(safe-area-inset-bottom, 0px))',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                letterSpacing: -0.1,
              }}>
                {t('adminOrderDetail.sendForApproval')}
              </div>
              <div style={{
                fontSize: 12,
                color: readyToSendOffer ? 'var(--text-tertiary)' : '#d97706',
                marginTop: 2,
              }}>
                {readyToSendOffer
                  ? t('adminOrderDetail.sendForApprovalContent')
                  : t('adminOrderDetail.missingForOffer')}
              </div>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              loading={updating}
              disabled={!readyToSendOffer}
              onClick={handleSendOffer}
              style={{
                height: 48, borderRadius: 12, fontWeight: 700,
                background: readyToSendOffer ? 'var(--accent)' : undefined,
                borderColor: readyToSendOffer ? 'var(--accent)' : undefined,
                minWidth: 220,
                boxShadow: readyToSendOffer ? '0 4px 14px rgba(0, 184, 86, 0.28)' : undefined,
                ...(isMobile ? { width: '100%' } : {}),
              }}
            >
              {t('adminOrderDetail.sendForApproval')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
