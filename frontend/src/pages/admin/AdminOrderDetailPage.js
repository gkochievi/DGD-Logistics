import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Descriptions, Typography, Spin, Button, Timeline, Image, Space,
  Select, Input, InputNumber, message, Empty, Grid, Divider, DatePicker, TimePicker, Tag, Alert, Modal,
} from 'antd';
import dayjs from 'dayjs';
import { useRealtimeRefresh, useNotifications } from '../../contexts/NotificationContext';
import {
  ArrowLeftOutlined, TagOutlined, CarOutlined, SyncOutlined,
  CommentOutlined, EnvironmentOutlined, PictureOutlined, HistoryOutlined,
  ThunderboltOutlined, UserOutlined, ClockCircleOutlined, DollarOutlined,
  PhoneOutlined, SendOutlined, CheckCircleOutlined,
  EditOutlined, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_OPTIONS, STATUS_CONFIG } from '../../utils/status';
import { MapView } from '../../components/map/MapPicker';
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
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [priceDraft, setPriceDraft] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPickupStops, setEditPickupStops] = useState([]);
  const [editDestStops, setEditDestStops] = useState([]);
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
    api.get('/categories/').then(({ data }) => {
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
      setComment((prev) => (prev ? prev : data.admin_comment || ''));
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
      setComment('');
      fetchOrder();
    } catch (err) {
      message.error(err.response?.data?.detail || t('adminOrderDetail.statusUpdateFailed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = () => {
    if (!newStatus || newStatus === order.status) {
      message.warning(t('adminOrderDetail.selectDifferent'));
      return;
    }
    const effectiveComment = (comment || order.admin_comment || '').trim();
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

  const handleCategoryChange = async (categoryId) => {
    try {
      await api.patch(`/orders/admin/${id}/`, { final_category: categoryId });
      message.success(t('adminOrderDetail.categoryUpdated'));
      fetchOrder();
    } catch {
      message.error(t('adminOrderDetail.categoryUpdateFailed'));
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
            comment: (comment || order.admin_comment || '').trim(),
          });
          message.success(t('adminOrderDetail.offerSentSuccess'));
          fetchOrder();
        } catch (err) {
          message.error(err.response?.data?.detail || t('adminOrderDetail.statusUpdateFailed'));
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  const handleCommentSave = async () => {
    try {
      await api.patch(`/orders/admin/${id}/`, { admin_comment: comment || order.admin_comment });
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
  };

  const handleEditSave = async () => {
    const pickupsCleaned = editPickupStops.filter(s => (s.text || '').trim());
    const destsCleaned = editDestStops.filter(s => (s.text || '').trim());
    if (!pickupsCleaned.length) {
      message.error(t('adminOrderDetail.editPickupRequired'));
      return;
    }
    const routeStops = {
      pickups: pickupsCleaned.map(s => ({ address: s.text, lat: s.coords?.lat ?? null, lng: s.coords?.lng ?? null })),
      destinations: destsCleaned.map(s => ({ address: s.text, lat: s.coords?.lat ?? null, lng: s.coords?.lng ?? null })),
      distance: order.route_stops?.distance ?? null,
      duration: order.route_stops?.duration ?? null,
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
  const renderStopList = (stops) => (
    stops.length > 1 ? (
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {stops.map((s, i) => (
          <li key={i}>{s.address || '—'}</li>
        ))}
      </ol>
    ) : (stops[0]?.address || '—')
  );
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

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }} className="page-enter">
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

      {/* Order Info */}
      <div style={sectionStyle}>
        <div style={{ ...sectionHeaderStyle, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <Descriptions column={isMobile ? 1 : 2} size="small" labelStyle={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
            <Descriptions.Item label={t('adminOrderDetail.customer')}>
              <span style={{ fontWeight: 600 }}>{order.user_detail?.full_name || '—'}</span>
              <span style={{ color: 'var(--text-tertiary)' }}> ({order.user_detail?.email})</span>
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.assigned')}><UrgencyBadge urgency={order.urgency} /></Descriptions.Item>
            <Descriptions.Item label={t('adminOrderDetail.selectedCategory')}>
              {localized(order.selected_category_detail?.name) || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adminOrderDetail.finalCategory')}>
              {localized(order.final_category_detail?.name) || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adminOrderDetail.suggestedCategory')}>
              {localized(order.suggested_category_detail?.name) || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.pickup')} span={isMobile ? 1 : 2}>
              {renderStopList(pickupStops)}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.destination')} span={isMobile ? 1 : 2}>
              {destStops.length ? renderStopList(destStops) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adminOrderDetail.requestedDate')}>{order.requested_date}</Descriptions.Item>
            <Descriptions.Item label={t('orders.time')}>{order.requested_time || '—'}</Descriptions.Item>
            <Descriptions.Item label={t('orders.contact')}>{order.contact_name}</Descriptions.Item>
            <Descriptions.Item label={t('auth.phone')}>{order.contact_phone}</Descriptions.Item>
            <Descriptions.Item label={t('orders.description')} span={isMobile ? 1 : 2}>
              {order.description}
            </Descriptions.Item>
            {order.cargo_details && (
              <Descriptions.Item label={t('newOrder.cargoDetails')} span={isMobile ? 1 : 2}>
                {order.cargo_details}
              </Descriptions.Item>
            )}
            {order.user_note && (
              <Descriptions.Item label={t('newOrder.notes')} span={isMobile ? 1 : 2}>
                {order.user_note}
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('adminOrderDetail.created')}>
              {new Date(order.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('adminOrderDetail.updated')}>
              {new Date(order.updated_at).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>

      {/* Admin Actions */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
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

          {/* Primary action: Send for Customer Approval — only when the offer
              hasn't been sent yet. Once sent, the banner above covers it. */}
          {!isTerminal && (order.status === 'new' || order.status === 'under_review') && (
            <div style={{
              background: readyToSendOffer
                ? 'linear-gradient(135deg, var(--accent-bg) 0%, var(--accent-bg-strong) 100%)'
                : 'var(--bg-tertiary)',
              borderRadius: 14,
              padding: isMobile ? '14px 16px' : '16px 20px',
              border: `1px solid ${readyToSendOffer ? 'var(--accent-bg-strong)' : 'var(--border-color)'}`,
              marginBottom: 20,
              display: 'flex', alignItems: 'center',
              gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                  letterSpacing: -0.1,
                }}>
                  {t('adminOrderDetail.sendForApproval')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {readyToSendOffer
                    ? t('adminOrderDetail.sendForApprovalContent')
                    : t('adminOrderDetail.missingForOffer')}
                </div>
              </div>
              <Button
                type="primary"
                size={isMobile ? 'large' : 'middle'}
                icon={<SendOutlined />}
                loading={updating}
                disabled={!readyToSendOffer}
                onClick={handleSendOffer}
                style={{
                  background: 'var(--accent)', borderColor: 'var(--accent)',
                  borderRadius: 10, fontWeight: 700,
                  ...(isMobile ? { width: '100%', height: 44 } : {}),
                }}
              >
                {t('adminOrderDetail.sendForApproval')}
              </Button>
            </div>
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

          {/* Assign Category */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <TagOutlined style={{ color: 'var(--accent)', fontSize: 14 }} />
              <Text style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                {t('adminOrderDetail.assignCategory')}
              </Text>
            </div>
            <Select
              style={{ width: '100%', maxWidth: isMobile ? '100%' : 340 }}
              size={isMobile ? 'large' : 'middle'}
              value={order.final_category || undefined}
              placeholder={t('adminOrderDetail.selectFinalCategory')}
              onChange={handleCategoryChange}
              disabled={isTerminal}
              options={categories.map((c) => ({ value: c.id, label: localized(c.name) }))}
            />
          </div>

          <Divider style={{ borderColor: 'var(--border-color)' }} />

          {/* Assign Vehicle */}
          <div style={{ marginBottom: 24 }}>
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
          <div style={{ marginBottom: 24 }}>
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
          <div style={{ marginBottom: 24 }}>
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
              value={comment || order.admin_comment || ''}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('adminOrderDetail.addComment')}
              status={newStatus === 'rejected' && !(comment || order.admin_comment || '').trim() ? 'error' : undefined}
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

      {/* Map */}
      {mapMarkers.length > 0 && (
        <div style={sectionStyle}>
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
        <div style={sectionStyle}>
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

      {/* Edit History */}
      {order.edit_history?.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <EditOutlined style={{ color: '#d97706', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>{t('adminOrderDetail.editHistory')}</Text>
          </div>
          <div style={{ padding: isMobile ? 16 : 24 }}>
            <Timeline
              items={order.edit_history.map((h) => ({
                color: '#d97706',
                children: (
                  <div>
                    <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                      {t(`adminOrderDetail.editField.${h.field_name}`) !== `adminOrderDetail.editField.${h.field_name}`
                        ? t(`adminOrderDetail.editField.${h.field_name}`)
                        : h.field_name}
                    </div>
                    <div style={{
                      padding: '6px 10px', background: 'var(--bg-secondary)',
                      borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)',
                      wordBreak: 'break-word',
                    }}>
                      <div>
                        <Text style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                          {t('adminOrderDetail.oldValue')}:
                        </Text>{' '}
                        <span style={{ textDecoration: 'line-through' }}>{h.old_value || '—'}</span>
                      </div>
                      <div>
                        <Text style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                          {t('adminOrderDetail.newValue')}:
                        </Text>{' '}
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{h.new_value || '—'}</span>
                      </div>
                    </div>
                    {h.changed_by_name && (
                      <Text style={{ color: 'var(--text-secondary)', fontSize: 12, display: 'block', marginTop: 4 }}>
                        {h.changed_by_name}
                      </Text>
                    )}
                    <Text style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2, display: 'block' }}>
                      {new Date(h.changed_at).toLocaleString()}
                    </Text>
                  </div>
                ),
              }))}
            />
          </div>
        </div>
      )}

      {/* Status History */}
      {order.status_history?.length > 0 && (
        <div style={sectionStyle}>
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

      {/* Edit Details Modal */}
      <Modal
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEditSave}
        title={t('adminOrderDetail.editDetails')}
        okText={t('adminOrderDetail.saveEdits')}
        cancelText={t('common.cancel')}
        confirmLoading={editSaving}
        width={isMobile ? '100%' : 680}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Pickups */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('newOrder.pickupFrom')}
            </Text>
            {editPickupStops.map((stop, idx) => (
              <div key={`edit-pickup-${idx}`} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
                    onClick={() => removeEditStop('pickup', idx)}
                    danger
                  />
                )}
              </div>
            ))}
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
            {editDestStops.map((stop, idx) => (
              <div key={`edit-dest-${idx}`} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
                  onClick={() => removeEditStop('dest', idx)}
                  danger
                />
              </div>
            ))}
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
              {t('orders.assigned')}
            </Text>
            <Select
              value={editUrgency}
              onChange={setEditUrgency}
              style={{ width: '100%' }}
              options={[
                { value: 'low', label: t('status.low') },
                { value: 'normal', label: t('status.normal') },
                { value: 'high', label: t('status.high') },
                { value: 'urgent', label: t('status.urgent') },
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
    </div>
  );
}
