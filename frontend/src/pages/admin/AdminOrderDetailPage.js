import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Descriptions, Typography, Spin, Button, Timeline, Image, Space,
  Select, Input, message, Empty, Grid, Divider, DatePicker, Tag, Alert, Modal,
} from 'antd';
import dayjs from 'dayjs';
import { useRealtimeRefresh, useNotifications } from '../../contexts/NotificationContext';
import {
  ArrowLeftOutlined, TagOutlined, CarOutlined, SyncOutlined,
  CommentOutlined, EnvironmentOutlined, PictureOutlined, HistoryOutlined,
  ThunderboltOutlined, UserOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_OPTIONS, STATUS_CONFIG } from '../../utils/status';
import { MapView } from '../../components/map/MapPicker';
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
      const catName = typeof v.category_name === 'string'
        ? v.category_name
        : (v.category_name?.[lang] || v.category_name?.en || '');
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

  const handleUrgencyChange = async (urgency) => {
    try {
      await api.patch(`/orders/admin/${id}/`, { urgency });
      message.success(t('adminOrderDetail.urgencyUpdated'));
      fetchOrder();
    } catch {
      message.error(t('adminOrderDetail.urgencyUpdateFailed'));
    }
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );
  if (!order) return <Empty description={t('adminOrderDetail.orderNotFound')} />;

  const isMobile = !screens.md;
  const TERMINAL_STATUSES = ['completed', 'rejected', 'cancelled'];
  const isTerminal = TERMINAL_STATUSES.includes(order.status);

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
        <div style={sectionHeaderStyle}>
          <Text style={sectionTitleStyle}>{t('adminOrderDetail.orderInfo')}</Text>
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
            <Descriptions.Item label={t('adminOrderDetail.suggestedCategory')}>
              {localized(order.suggested_category_detail?.name) || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.pickup')} span={isMobile ? 1 : 2}>
              {order.pickup_location}
            </Descriptions.Item>
            <Descriptions.Item label={t('orders.destination')} span={isMobile ? 1 : 2}>
              {order.destination_location || '—'}
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
                marginTop: 10, padding: '10px 14px',
                background: 'var(--accent-bg)', borderRadius: 10,
                fontSize: 13, color: 'var(--text-secondary)',
                border: '1px solid var(--accent-bg-strong)',
              }}>
                {order.assigned_vehicle_detail.name} · {order.assigned_vehicle_detail.plate_number}
                {order.assigned_vehicle_detail.price_per_hour && ` · ${currency.symbol}${order.assigned_vehicle_detail.price_per_hour}/hr`}
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
                    marginTop: 10, padding: '10px 14px',
                    background: 'var(--accent-bg)', borderRadius: 10,
                    fontSize: 13, color: 'var(--text-secondary)',
                    border: '1px solid var(--accent-bg-strong)',
                  }}>
                    {order.assigned_driver_detail.full_name} · {order.assigned_driver_detail.phone}
                    {order.assigned_driver_detail.license_categories && (
                      <> · <Tag style={{ margin: 0 }}>{order.assigned_driver_detail.license_categories}</Tag></>
                    )}
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
                options={STATUS_OPTIONS}
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
      {(order.pickup_lat && order.pickup_lng) && (
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <EnvironmentOutlined style={{ color: '#10b981', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>{t('adminOrderDetail.locationMap')}</Text>
          </div>
          <div style={{ padding: 0 }}>
            <MapView
              height={260}
              markers={[
                { position: [order.pickup_lat, order.pickup_lng], color: 'green' },
                ...(order.destination_lat && order.destination_lng
                  ? [{ position: [order.destination_lat, order.destination_lng], color: 'red' }]
                  : []),
              ]}
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
    </div>
  );
}
