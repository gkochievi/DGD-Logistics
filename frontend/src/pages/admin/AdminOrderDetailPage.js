import React, { useEffect, useState } from 'react';
import {
  Card, Descriptions, Typography, Spin, Button, Timeline, Image, Space,
  Select, Input, message, Empty, Grid, Divider, Modal,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
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

  const handleCommentSave = async () => {
    try {
      await api.patch(`/orders/admin/${id}/`, { admin_comment: comment || order.admin_comment });
      message.success(t('adminOrderDetail.commentSaved'));
      fetchOrder();
    } catch {
      message.error(t('adminOrderDetail.commentSaveFailed'));
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!order) return <Empty description={t('adminOrderDetail.orderNotFound')} />;

  const isMobile = !screens.md;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/orders')}
          size={isMobile ? 'large' : 'middle'}>
          {isMobile ? '' : t('common.back')}
        </Button>
        <Title level={4} style={{ margin: 0 }}>{t('orders.orderDetail', { id: order.id })}</Title>
        <StatusBadge status={order.status} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={isMobile ? 1 : 2} bordered size="small" title={t('adminOrderDetail.orderInfo')}>
          <Descriptions.Item label={t('adminOrderDetail.customer')}>
            {order.user_detail?.full_name || '—'} ({order.user_detail?.email})
          </Descriptions.Item>
          <Descriptions.Item label={t('orders.assigned')}><UrgencyBadge urgency={order.urgency} /></Descriptions.Item>
          <Descriptions.Item label={t('adminOrderDetail.selectedCategory')}>{order.selected_category_detail?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('adminOrderDetail.suggestedCategory')}>{order.suggested_category_detail?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('orders.pickup')} span={isMobile ? 1 : 2}>{order.pickup_location}</Descriptions.Item>
          <Descriptions.Item label={t('orders.destination')} span={isMobile ? 1 : 2}>{order.destination_location || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('adminOrderDetail.requestedDate')}>{order.requested_date}</Descriptions.Item>
          <Descriptions.Item label={t('orders.time')}>{order.requested_time || '—'}</Descriptions.Item>
          <Descriptions.Item label={t('orders.contact')}>{order.contact_name}</Descriptions.Item>
          <Descriptions.Item label={t('auth.phone')}>{order.contact_phone}</Descriptions.Item>
          <Descriptions.Item label={t('orders.description')} span={isMobile ? 1 : 2}>{order.description}</Descriptions.Item>
          {order.cargo_details && (
            <Descriptions.Item label={t('newOrder.cargoDetails')} span={isMobile ? 1 : 2}>{order.cargo_details}</Descriptions.Item>
          )}
          {order.user_note && (
            <Descriptions.Item label={t('newOrder.notes')} span={isMobile ? 1 : 2}>{order.user_note}</Descriptions.Item>
          )}
          <Descriptions.Item label={t('adminOrderDetail.created')}>{new Date(order.created_at).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label={t('adminOrderDetail.updated')}>{new Date(order.updated_at).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Admin actions */}
      <Card title={t('adminOrderDetail.adminActions')} style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('adminOrderDetail.assignCategory')}</Text>
          <Select
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 300 }}
            size={isMobile ? 'large' : 'middle'}
            value={order.final_category || undefined}
            placeholder={t('adminOrderDetail.selectFinalCategory')}
            onChange={handleCategoryChange}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('adminOrderDetail.assignVehicle')}</Text>
          <Select
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 300 }}
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
              marginTop: 8, padding: '8px 12px', background: 'var(--accent-bg)', borderRadius: 8, fontSize: 13,
            }}>
              {order.assigned_vehicle_detail.name} · {order.assigned_vehicle_detail.plate_number}
              {order.assigned_vehicle_detail.price_per_hour && ` · $${order.assigned_vehicle_detail.price_per_hour}/hr`}
            </div>
          )}
        </div>

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('adminOrderDetail.changeStatus')}</Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              style={{ width: isMobile ? '100%' : 180 }}
              size={isMobile ? 'large' : 'middle'}
              value={newStatus}
              onChange={setNewStatus}
              options={STATUS_OPTIONS}
            />
            <Button type="primary" loading={updating} onClick={handleStatusChange}
              size={isMobile ? 'large' : 'middle'} style={isMobile ? { width: '100%', height: 44 } : {}}>
              {t('adminOrderDetail.updateStatus')}
            </Button>
          </div>
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('adminOrderDetail.adminCommentLabel')}</Text>
          <TextArea
            rows={3}
            value={comment || order.admin_comment || ''}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('adminOrderDetail.addComment')}
          />
          <Button style={{ marginTop: 8 }} onClick={handleCommentSave}>{t('adminOrderDetail.saveComment')}</Button>
        </div>
      </Card>

      {(order.pickup_lat && order.pickup_lng) && (
        <Card title={t('adminOrderDetail.locationMap')} style={{ marginBottom: 16 }}>
          <MapView
            height={250}
            markers={[
              { position: [order.pickup_lat, order.pickup_lng], color: 'green' },
              ...(order.destination_lat && order.destination_lng
                ? [{ position: [order.destination_lat, order.destination_lng], color: 'red' }]
                : []),
            ]}
          />
        </Card>
      )}

      {order.images?.length > 0 && (
        <Card title={t('adminOrderDetail.uploadedImages')} style={{ marginBottom: 16 }}>
          <Image.PreviewGroup>
            <Space wrap>
              {order.images.map((img) => (
                <Image key={img.id} width={120} height={120} src={img.image}
                  style={{ objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}

      {order.status_history?.length > 0 && (
        <Card title={t('orders.statusHistory')}>
          <Timeline
            items={order.status_history.map((h) => ({
              color: STATUS_CONFIG[h.new_status]?.color || 'gray',
              children: (
                <div>
                  <div>
                    <StatusBadge status={h.new_status} />
                    {h.old_status && <Text type="secondary"> {t('status.' + h.old_status)}</Text>}
                  </div>
                  {h.changed_by_name && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{h.changed_by_name}</Text>
                  )}
                  {h.comment && <div><Text type="secondary" style={{ fontSize: 12 }}>{h.comment}</Text></div>}
                  <div><Text type="secondary" style={{ fontSize: 11 }}>{new Date(h.created_at).toLocaleString()}</Text></div>
                </div>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
}
