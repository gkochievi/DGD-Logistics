import React, { useEffect, useState } from 'react';
import {
  Descriptions, Typography, Spin, Button, Timeline, Image, Space,
  Select, Input, message, Empty, Grid, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, TagOutlined, CarOutlined, SyncOutlined,
  CommentOutlined, EnvironmentOutlined, PictureOutlined, HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_OPTIONS, STATUS_CONFIG } from '../../utils/status';
import { MapView } from '../../components/map/MapPicker';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t } = useLang();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.get('/categories/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    });
    api.get('/vehicles/admin/').then(({ data }) => {
      const results = data.results || data;
      setVehicles(Array.isArray(results) ? results : []);
    });
  }, []);

  const fetchOrder = () => {
    setLoading(true);
    api.get(`/orders/admin/${id}/`).then(({ data }) => {
      setOrder(data);
      setNewStatus(data.status);
    }).catch(() => message.error(t('adminOrderDetail.orderNotFound')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrder(); }, [id]); // eslint-disable-line

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === order.status) {
      message.warning(t('adminOrderDetail.selectDifferent'));
      return;
    }
    setUpdating(true);
    try {
      await api.post(`/orders/admin/${id}/status/`, { status: newStatus, comment });
      message.success(t('adminOrderDetail.statusUpdated'));
      setComment('');
      fetchOrder();
    } catch (err) {
      message.error(err.response?.data?.detail || t('adminOrderDetail.statusUpdateFailed'));
    } finally {
      setUpdating(false);
    }
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

  const handleVehicleAssign = async (vehicleId) => {
    try {
      await api.patch(`/orders/admin/${id}/`, { assigned_vehicle: vehicleId || null });
      message.success(t('adminOrderDetail.vehicleAssigned'));
      fetchOrder();
    } catch {
      message.error(t('adminOrderDetail.vehicleAssignFailed'));
    }
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

  const sectionStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  };

  const sectionHeaderStyle = {
    padding: '16px 24px',
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
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 24, flexWrap: 'wrap',
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/orders')}
          size={isMobile ? 'large' : 'middle'}
          style={{ borderRadius: 10, border: '1px solid var(--border-color)' }}
        >
          {isMobile ? '' : t('common.back')}
        </Button>
        <Title level={3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
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
              {order.selected_category_detail?.name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adminOrderDetail.suggestedCategory')}>
              {order.suggested_category_detail?.name || '—'}
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
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>

          <Divider style={{ borderColor: 'var(--border-color)' }} />

          {/* Assign Vehicle */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <CarOutlined style={{ color: '#009E4A', fontSize: 14 }} />
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
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.name} (${v.plate_number}) — ${v.category_name}`,
              }))}
            />
            {order.assigned_vehicle_detail && (
              <div style={{
                marginTop: 10, padding: '10px 14px',
                background: 'var(--accent-bg)', borderRadius: 10,
                fontSize: 13, color: 'var(--text-secondary)',
                border: '1px solid var(--accent-bg-strong)',
              }}>
                {order.assigned_vehicle_detail.name} · {order.assigned_vehicle_detail.plate_number}
                {order.assigned_vehicle_detail.price_per_hour && ` · $${order.assigned_vehicle_detail.price_per_hour}/hr`}
              </div>
            )}
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
                options={STATUS_OPTIONS}
              />
              <Button
                type="primary"
                loading={updating}
                onClick={handleStatusChange}
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
            </div>
            <TextArea
              rows={3}
              value={comment || order.admin_comment || ''}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('adminOrderDetail.addComment')}
              style={{ borderRadius: 10 }}
            />
            <Button
              onClick={handleCommentSave}
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
            <PictureOutlined style={{ color: '#009E4A', fontSize: 15 }} />
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
