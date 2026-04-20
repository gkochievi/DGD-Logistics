import React, { useEffect, useState } from 'react';
import { Spin, Image, Button, Modal, message, Badge, Grid } from 'antd';
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

const { useBreakpoint } = Grid;

const STATUS_BADGE_COLORS = {
  new: '#00B856',
  under_review: '#f59e0b',
  approved: '#06b6d4',
  in_progress: '#3b82f6',
  completed: '#10b981',
  rejected: '#ef4444',
  cancelled: '#8e93ab',
};

const STATUS_STEPS = ['new', 'under_review', 'approved', 'in_progress', 'completed'];

export default function AppOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const localized = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v[lang] || v['en'] || '';
  };
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', paddingBottom: 100, maxWidth: isMobile ? '100%' : 800, margin: isMobile ? 0 : '0 auto', padding: isMobile ? 0 : '0 40px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: isMobile ? '14px 16px' : '20px 0',
        paddingTop: isMobile ? 'calc(14px + env(safe-area-inset-top, 0px))' : 20,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div
          onClick={() => navigate('/app/orders')}
          style={{
            width: 38, height: 38, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)',
            background: 'var(--bg-tertiary)',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeftOutlined />
        </div>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.2 }}>
          {t('orders.orderDetail', { id: order.id })}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: STATUS_BADGE_COLORS[order.status] || '#8e93ab',
          background: `${STATUS_BADGE_COLORS[order.status] || '#8e93ab'}14`,
          padding: '5px 12px',
          borderRadius: 10,
          letterSpacing: 0.1,
        }}>
          {t('status.' + order.status) || order.status}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Status progress tracker */}
        {!isTerminal && (
          <div style={{
            background: 'var(--card-bg)', borderRadius: 16, padding: '20px 16px',
            marginBottom: 12, boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)',
            animation: 'fadeInUp 0.4s ease-out both',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 18,
              letterSpacing: -0.1,
            }}>
              {t('orders.orderProgress')}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
              {STATUS_STEPS.map((s, i) => {
                const done = i <= statusIdx;
                const isCurrent = i === statusIdx;
                const stepColor = done ? (STATUS_BADGE_COLORS[s] || 'var(--accent)') : 'var(--border-color)';
                return (
                  <React.Fragment key={s}>
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      flex: 0, minWidth: 0,
                    }}>
                      <div style={{
                        width: isCurrent ? 32 : 22,
                        height: isCurrent ? 32 : 22,
                        borderRadius: '50%',
                        background: done ? stepColor : 'var(--bg-tertiary)',
                        border: done ? 'none' : '2px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                        boxShadow: isCurrent ? `0 0 0 4px ${stepColor}20` : 'none',
                      }}>
                        {done && <CheckCircleOutlined style={{ color: '#fff', fontSize: isCurrent ? 16 : 11 }} />}
                      </div>
                      <div style={{
                        fontSize: 9, marginTop: 6, textAlign: 'center',
                        fontWeight: isCurrent ? 700 : done ? 500 : 400,
                        color: isCurrent ? stepColor : done ? 'var(--text-primary)' : 'var(--text-placeholder)',
                        whiteSpace: 'nowrap',
                        letterSpacing: -0.1,
                      }}>
                        {t('status.' + s)}
                      </div>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{
                        flex: 1, height: 3, marginBottom: 22,
                        borderRadius: 2,
                        background: i < statusIdx
                          ? (STATUS_BADGE_COLORS[STATUS_STEPS[i + 1]] || 'var(--accent)')
                          : 'var(--bg-tertiary)',
                        transition: 'background 0.35s ease',
                        marginTop: isCurrent ? 14 : 9,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Terminal state (cancelled/rejected) */}
        {isTerminal && (
          <div style={{
            background: isRejected ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
            borderRadius: 16, padding: '24px 20px', marginBottom: 12,
            border: isRejected ? '1px solid var(--danger-border)' : '1px solid var(--border-color)',
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease-out both',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12,
              background: isRejected ? '#ef444414' : 'var(--badge-muted-bg)',
            }}>
              <CloseCircleOutlined style={{
                fontSize: 28,
                color: isRejected ? '#ef4444' : 'var(--text-tertiary)',
              }} />
            </div>
            <div style={{
              fontSize: 17, fontWeight: 700,
              color: isRejected ? '#ef4444' : 'var(--text-secondary)',
              letterSpacing: -0.2,
            }}>
              {isRejected ? t('orders.orderRejected') : t('orders.orderCancelled')}
            </div>
            {order.admin_comment && (
              <div style={{
                fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8,
                lineHeight: 1.5, maxWidth: 280, margin: '8px auto 0',
              }}>
                {order.admin_comment}
              </div>
            )}
          </div>
        )}

        {/* Transport type */}
        <DetailCard delay={0.05}>
          <DetailRow icon={<CarOutlined />} label={t('orders.transport')} value={localized(order.selected_category_detail?.name) || '—'} />
          {order.final_category_detail?.name && (
            <DetailRow icon={<CheckCircleOutlined />} label={t('orders.assigned')} value={localized(order.final_category_detail.name)} />
          )}
        </DetailCard>

        {/* Locations */}
        <DetailCard delay={0.1}>
          <DetailRow
            icon={<EnvironmentOutlined style={{ color: 'var(--success-color)' }} />}
            label={t('orders.pickup')}
            value={order.pickup_location}
          />
          {order.destination_location && (
            <DetailRow
              icon={<EnvironmentOutlined style={{ color: '#ef4444' }} />}
              label={t('orders.destination')}
              value={order.destination_location}
            />
          )}
        </DetailCard>

        {/* Map */}
        {(order.pickup_lat && order.pickup_lng) && (
          <DetailCard delay={0.15}>
            <div style={{
              fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10,
              fontWeight: 500, letterSpacing: 0.2, textTransform: 'uppercase',
            }}>
              {t('orders.locationMap')}
            </div>
            <div style={{ borderRadius: 12, overflow: 'hidden' }}>
              <MapView
                height={170}
                markers={[
                  { position: [order.pickup_lat, order.pickup_lng], color: 'green' },
                  ...(order.destination_lat && order.destination_lng
                    ? [{ position: [order.destination_lat, order.destination_lng], color: 'red' }]
                    : []),
                ]}
              />
            </div>
          </DetailCard>
        )}

        {/* Assigned vehicle */}
        {order.assigned_vehicle_detail && (
          <DetailCard delay={0.2}>
            <DetailRow
              icon={<CarOutlined style={{ color: 'var(--accent)' }} />}
              label={t('orders.assignedVehicle')}
              value={order.assigned_vehicle_detail.name}
            />
            {order.assigned_vehicle_detail.plate_number && (
              <div style={{
                fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 30,
                background: 'var(--badge-muted-bg)', display: 'inline-block',
                padding: '2px 8px', borderRadius: 6, marginTop: 2,
              }}>
                {t('orders.plate')}: {order.assigned_vehicle_detail.plate_number}
              </div>
            )}
          </DetailCard>
        )}

        {/* Date & time */}
        <DetailCard delay={0.25}>
          <DetailRow icon={<CalendarOutlined />} label={t('orders.date')} value={order.requested_date} />
          {order.requested_time && (
            <DetailRow icon={<ClockCircleOutlined />} label={t('orders.time')} value={order.requested_time} />
          )}
        </DetailCard>

        {/* Contact info */}
        <DetailCard delay={0.3}>
          <DetailRow icon={<UserOutlined />} label={t('orders.contact')} value={order.contact_name} />
          <DetailRow icon={<PhoneOutlined />} label={t('auth.phone')} value={order.contact_phone} />
        </DetailCard>

        {/* Description */}
        {order.description && (
          <DetailCard delay={0.35}>
            <div style={{
              fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6,
              fontWeight: 500, letterSpacing: 0.2, textTransform: 'uppercase',
            }}>
              {t('orders.description')}
            </div>
            <div style={{
              fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
              letterSpacing: -0.1,
            }}>
              {order.description}
            </div>
          </DetailCard>
        )}

        {/* Admin comment */}
        {order.admin_comment && !isTerminal && (
          <DetailCard delay={0.4}>
            <div style={{
              fontSize: 11, color: 'var(--warning-color)', marginBottom: 6,
              fontWeight: 600, letterSpacing: 0.2, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t('orders.adminComment')}
            </div>
            <div style={{
              fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
              background: '#f59e0b08', borderRadius: 10, padding: '10px 12px',
              border: '1px solid #f59e0b18',
            }}>
              {order.admin_comment}
            </div>
          </DetailCard>
        )}

        {/* Images */}
        {order.images?.length > 0 && (
          <DetailCard delay={0.45}>
            <div style={{
              fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10,
              fontWeight: 500, letterSpacing: 0.2, textTransform: 'uppercase',
            }}>
              {t('orders.photos')}
            </div>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {order.images.map((img) => (
                  <Image key={img.id} width={76} height={76} src={img.image}
                    style={{ objectFit: 'cover', borderRadius: 12 }} />
                ))}
              </div>
            </Image.PreviewGroup>
          </DetailCard>
        )}

        {/* Status history timeline */}
        {order.status_history?.length > 0 && (
          <DetailCard delay={0.5}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16,
              letterSpacing: -0.1,
            }}>
              {t('orders.statusHistory')}
            </div>
            <div style={{ position: 'relative' }}>
              {order.status_history.map((h, i) => {
                const dotColor = STATUS_BADGE_COLORS[h.new_status] || 'var(--text-placeholder)';
                const isLast = i === order.status_history.length - 1;
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 14, marginBottom: isLast ? 0 : 20,
                    alignItems: 'flex-start', position: 'relative',
                  }}>
                    {/* Timeline line + dot */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      flexShrink: 0, width: 20,
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: dotColor,
                        border: '2px solid var(--card-bg)',
                        boxShadow: `0 0 0 2px ${dotColor}30`,
                        flexShrink: 0, zIndex: 1,
                      }} />
                      {!isLast && (
                        <div style={{
                          width: 2, flex: 1, minHeight: 24,
                          background: 'var(--border-color)',
                          marginTop: 4,
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                        lineHeight: 1,
                      }}>
                        {t('status.' + h.new_status) || h.new_status}
                      </div>
                      {h.comment && (
                        <div style={{
                          fontSize: 12, color: 'var(--text-secondary)', marginTop: 4,
                          lineHeight: 1.4,
                        }}>
                          {h.comment}
                        </div>
                      )}
                      <div style={{
                        fontSize: 11, color: 'var(--text-placeholder)', marginTop: 4,
                      }}>
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DetailCard>
        )}
      </div>

      {/* Cancel button */}
      {order.is_cancellable && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--glass-border)',
          zIndex: 99, maxWidth: isMobile ? '100%' : 800, margin: '0 auto',
        }}>
          <Button
            danger block onClick={handleCancel}
            icon={<CloseCircleOutlined />}
            style={{
              height: 50, borderRadius: 14, fontSize: 15, fontWeight: 600,
              boxShadow: 'none',
            }}
          >
            {t('orders.cancelOrder')}
          </Button>
        </div>
      )}
    </div>
  );
}


function DetailCard({ children, delay = 0 }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 16, padding: '16px 16px',
      marginBottom: 10, boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-color)',
      animation: `fadeInUp 0.4s ease-out ${delay}s both`,
    }}>
      {children}
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
      <span style={{
        color: 'var(--text-tertiary)', fontSize: 15, marginTop: 1,
        width: 20, textAlign: 'center', flexShrink: 0,
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: 'var(--text-tertiary)',
          fontWeight: 500, letterSpacing: 0.1,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-word',
          fontWeight: 500, marginTop: 1, lineHeight: 1.4,
        }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}
