import React, { useEffect, useState } from 'react';
import { Spin, Image, Button, Modal, message, Badge } from 'antd';
import {
  ArrowLeftOutlined, EnvironmentOutlined, CalendarOutlined,
  ClockCircleOutlined, UserOutlined, PhoneOutlined,
  CloseCircleOutlined, CarOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';
import { STATUS_CONFIG } from '../../utils/status';
import { MapView } from '../../components/map/MapPicker';

const STATUS_BADGE_COLORS = {
  new: '#1677ff',
  under_review: '#fa8c16',
  approved: '#13c2c2',
  in_progress: '#2f54eb',
  completed: '#52c41a',
  rejected: '#ff4d4f',
  cancelled: '#999',
};

const STATUS_STEPS = ['new', 'under_review', 'approved', 'in_progress', 'completed'];

export default function AppOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = () => {
    setLoading(true);
    api.get(`/orders/${id}/`).then(({ data }) => setOrder(data))
      .catch(() => message.error(t('orders.orderDetail', { id })))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrder(); }, [id]); // eslint-disable-line

  const handleCancel = () => {
    Modal.confirm({
      title: t('orders.cancelConfirm'),
      content: t('orders.cancelWarning'),
      okText: t('orders.yesCancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          await api.post(`/orders/${id}/cancel/`);
          message.success(t('orders.orderCancelledMsg'));
          fetchOrder();
        } catch (err) {
          message.error(err.response?.data?.detail || t('orders.failedCancel'));
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) return null;

  const statusIdx = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const isRejected = order.status === 'rejected';
  const isTerminal = isCancelled || isRejected;

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div
          onClick={() => navigate('/app/orders')}
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)',
          }}
        >
          <ArrowLeftOutlined />
        </div>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('orders.orderDetail', { id: order.id })}
        </div>
        <Badge
          count={t('status.' + order.status) || order.status}
          style={{
            backgroundColor: STATUS_BADGE_COLORS[order.status] || '#999',
            fontSize: 12, padding: '0 10px', borderRadius: 8,
          }}
        />
      </div>

      <div style={{ padding: '16px' }}>
        {/* Status tracker */}
        {!isTerminal && (
          <div style={{
            background: 'var(--card-bg)', borderRadius: 16, padding: '18px 16px',
            marginBottom: 12, boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
              {t('orders.orderProgress')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {STATUS_STEPS.map((s, i) => {
                const done = i <= statusIdx;
                const isCurrent = i === statusIdx;
                const cfg = STATUS_CONFIG[s];
                return (
                  <React.Fragment key={s}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      flex: i < STATUS_STEPS.length - 1 ? 0 : 0,
                      minWidth: 0,
                    }}>
                      <div style={{
                        width: isCurrent ? 28 : 20,
                        height: isCurrent ? 28 : 20,
                        borderRadius: '50%',
                        background: done ? STATUS_BADGE_COLORS[s] || '#1677ff' : 'var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}>
                        {done && <CheckCircleOutlined style={{ color: '#fff', fontSize: isCurrent ? 14 : 10 }} />}
                      </div>
                      <div style={{
                        fontSize: 9, color: done ? 'var(--text-primary)' : 'var(--text-placeholder)',
                        marginTop: 4, textAlign: 'center', fontWeight: isCurrent ? 600 : 400,
                        whiteSpace: 'nowrap',
                      }}>
                        {t('status.' + s)}
                      </div>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{
                        flex: 1, height: 2, marginBottom: 18,
                        background: i < statusIdx ? STATUS_BADGE_COLORS[STATUS_STEPS[i + 1]] || '#1677ff' : 'var(--border-color)',
                        transition: 'background 0.3s',
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {isTerminal && (
          <div style={{
            background: isRejected ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
            borderRadius: 16, padding: '18px 16px', marginBottom: 12,
            border: isRejected ? '1px solid var(--danger-border)' : '1px solid var(--border-color)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {isRejected ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> : <CloseCircleOutlined style={{ color: 'var(--text-tertiary)' }} />}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: isRejected ? '#ff4d4f' : 'var(--text-secondary)' }}>
              {isRejected ? t('orders.orderRejected') : t('orders.orderCancelled')}
            </div>
            {order.admin_comment && (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>{order.admin_comment}</div>
            )}
          </div>
        )}

        {/* Details card */}
        <DetailCard>
          <DetailRow icon={<CarOutlined />} label={t('orders.transport')} value={order.selected_category_detail?.name || '—'} />
          {order.final_category_detail?.name && (
            <DetailRow icon={<CheckCircleOutlined />} label={t('orders.assigned')} value={order.final_category_detail.name} />
          )}
        </DetailCard>

        <DetailCard>
          <DetailRow icon={<EnvironmentOutlined style={{ color: '#52c41a' }} />} label={t('orders.pickup')} value={order.pickup_location} />
          {order.destination_location && (
            <DetailRow icon={<EnvironmentOutlined style={{ color: '#ff4d4f' }} />} label={t('orders.destination')} value={order.destination_location} />
          )}
        </DetailCard>

        {(order.pickup_lat && order.pickup_lng) && (
          <DetailCard>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{t('orders.locationMap')}</div>
            <MapView
              height={160}
              markers={[
                { position: [order.pickup_lat, order.pickup_lng], color: 'green' },
                ...(order.destination_lat && order.destination_lng
                  ? [{ position: [order.destination_lat, order.destination_lng], color: 'red' }]
                  : []),
              ]}
            />
          </DetailCard>
        )}

        {order.assigned_vehicle_detail && (
          <DetailCard>
            <DetailRow icon={<CarOutlined style={{ color: '#1677ff' }} />} label={t('orders.assignedVehicle')} value={order.assigned_vehicle_detail.name} />
            {order.assigned_vehicle_detail.plate_number && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 28 }}>{t('orders.plate')}: {order.assigned_vehicle_detail.plate_number}</div>
            )}
          </DetailCard>
        )}

        <DetailCard>
          <DetailRow icon={<CalendarOutlined />} label={t('orders.date')} value={order.requested_date} />
          {order.requested_time && (
            <DetailRow icon={<ClockCircleOutlined />} label={t('orders.time')} value={order.requested_time} />
          )}
        </DetailCard>

        <DetailCard>
          <DetailRow icon={<UserOutlined />} label={t('orders.contact')} value={order.contact_name} />
          <DetailRow icon={<PhoneOutlined />} label={t('auth.phone')} value={order.contact_phone} />
        </DetailCard>

        {order.description && (
          <DetailCard>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('orders.description')}</div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{order.description}</div>
          </DetailCard>
        )}

        {order.admin_comment && !isTerminal && (
          <DetailCard>
            <div style={{ fontSize: 12, color: '#fa8c16', marginBottom: 4 }}>{t('orders.adminComment')}</div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{order.admin_comment}</div>
          </DetailCard>
        )}

        {/* Images */}
        {order.images?.length > 0 && (
          <DetailCard>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{t('orders.photos')}</div>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {order.images.map((img) => (
                  <Image key={img.id} width={72} height={72} src={img.image}
                    style={{ objectFit: 'cover', borderRadius: 10 }} />
                ))}
              </div>
            </Image.PreviewGroup>
          </DetailCard>
        )}

        {/* Status history */}
        {order.status_history?.length > 0 && (
          <DetailCard>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              {t('orders.statusHistory')}
            </div>
            {order.status_history.map((h, i) => {
              const cfg = STATUS_CONFIG[h.new_status] || {};
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: STATUS_BADGE_COLORS[h.new_status] || 'var(--text-placeholder)',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {t('status.' + h.new_status) || h.new_status}
                    </div>
                    {h.comment && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{h.comment}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginTop: 2 }}>
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </DetailCard>
        )}
      </div>

      {/* Cancel button */}
      {order.is_cancellable && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)',
          zIndex: 99, maxWidth: 480, margin: '0 auto',
        }}>
          <Button
            danger block onClick={handleCancel}
            icon={<CloseCircleOutlined />}
            style={{ height: 48, borderRadius: 14, fontSize: 15, fontWeight: 500 }}
          >
            {t('orders.cancelOrder')}
          </Button>
        </div>
      )}
    </div>
  );
}


function DetailCard({ children }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 14, padding: '14px 16px',
      marginBottom: 8, boxShadow: 'var(--shadow-sm)',
    }}>
      {children}
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
      <span style={{ color: 'var(--text-placeholder)', fontSize: 15, marginTop: 1, width: 18, textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value || '—'}</div>
      </div>
    </div>
  );
}
