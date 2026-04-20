import React, { useCallback, useEffect, useState } from 'react';
import { Spin, Image, Button, Modal, message, Grid } from 'antd';
import {
  ArrowLeftOutlined, EnvironmentOutlined, CalendarOutlined,
  ClockCircleOutlined, UserOutlined, PhoneOutlined,
  CloseCircleOutlined, CarOutlined, CheckCircleOutlined,
  FileTextOutlined, CameraOutlined, InboxOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';
import { useRealtimeRefresh, useNotifications } from '../../contexts/NotificationContext';
import { MapView } from '../../components/map/MapPicker';
import { CategoryImage } from '../../utils/categoryIcons';

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
  const isDesktop = screens.md;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshNotifications } = useNotifications();

  const fetchOrder = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    return api.get(`/orders/${id}/`).then(({ data }) => {
      setOrder(data);
      refreshNotifications();
    })
      .catch(() => { if (!silent) message.error(t('orders.orderDetail', { id })); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [id, t, refreshNotifications]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  useRealtimeRefresh(useCallback(() => {
    fetchOrder({ silent: true });
  }, [fetchOrder]));

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
  const statusColor = STATUS_BADGE_COLORS[order.status] || '#8e93ab';

  const pickupStops = order.route_stops?.pickups?.length
    ? order.route_stops.pickups
    : (order.pickup_location ? [{ address: order.pickup_location, lat: order.pickup_lat, lng: order.pickup_lng }] : []);
  const destStops = order.route_stops?.destinations?.length
    ? order.route_stops.destinations
    : (order.destination_location ? [{ address: order.destination_location, lat: order.destination_lat, lng: order.destination_lng }] : []);
  const hasDest = destStops.length > 0;

  const mapMarkers = [
    ...pickupStops.filter(s => s.lat && s.lng).map(s => ({ position: [s.lat, s.lng], color: 'green' })),
    ...destStops.filter(s => s.lat && s.lng).map(s => ({ position: [s.lat, s.lng], color: 'red' })),
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: order.is_cancellable ? 100 : 40, maxWidth: 1200, margin: '0 auto' }} className="app-bg page-enter">
      {/* ── Hero Header ── */}
      <div style={{
        background: 'var(--header-gradient)',
        padding: isDesktop ? '36px 40px 40px' : '28px 20px 32px',
        paddingTop: isDesktop ? 36 : 'calc(28px + env(safe-area-inset-top, 0px))',
        borderRadius: isDesktop ? '0 0 24px 24px' : '0 0 32px 32px',
        position: 'relative',
        overflow: 'hidden',
        color: '#fff',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -30, width: 120, height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '60%', width: 80, height: 80,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div onClick={() => navigate('/app/orders')} style={{
              width: 44, height: 44, borderRadius: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 17, color: '#fff',
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}>
              <ArrowLeftOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.2 }}>
                {t('orders.orderDetail', { id: order.id })}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: 500 }}>
                {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Status chip */}
          <div style={{
            marginTop: 22,
            background: 'rgba(255,255,255,0.13)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 18,
            padding: '14px 18px',
            border: '1px solid rgba(255,255,255,0.16)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 0 4px ${statusColor}40`,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t('orders.status') || 'Status'}
              </div>
              <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, marginTop: 2, letterSpacing: -0.1 }}>
                {t('status.' + order.status) || order.status}
              </div>
            </div>
            {localized(order.selected_category_detail?.name) && (
              <div style={{
                padding: '6px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.18)',
                fontSize: 12, fontWeight: 600, color: '#fff',
                whiteSpace: 'nowrap',
              }}>
                {localized(order.selected_category_detail?.name)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: isDesktop ? '32px 40px 48px' : '24px 20px 48px' }}>
        {/* ── Status Progress Tracker ── */}
        {!isTerminal && (
          <ConfirmSection delay={0.05} icon={<HistoryOutlined />} title={t('orders.orderProgress')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, paddingTop: 4 }}>
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
                        fontSize: 10, marginTop: 8, textAlign: 'center',
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
                        flex: 1, height: 3, marginBottom: 26,
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
          </ConfirmSection>
        )}

        {/* ── Terminal state banner ── */}
        {isTerminal && (
          <div style={{
            background: isRejected ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
            borderRadius: 18, padding: '28px 24px', marginBottom: 24,
            border: isRejected ? '1px solid var(--danger-border)' : '1px solid var(--border-color)',
            textAlign: 'center',
            animation: 'fadeInUp 0.4s ease-out both',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
              background: isRejected ? '#ef444414' : 'var(--badge-muted-bg)',
            }}>
              <CloseCircleOutlined style={{
                fontSize: 32,
                color: isRejected ? '#ef4444' : 'var(--text-tertiary)',
              }} />
            </div>
            <div style={{
              fontSize: 18, fontWeight: 800,
              color: isRejected ? '#ef4444' : 'var(--text-secondary)',
              letterSpacing: -0.3,
            }}>
              {isRejected ? t('orders.orderRejected') : t('orders.orderCancelled')}
            </div>
            {order.admin_comment && (
              <div style={{
                fontSize: 13, color: 'var(--text-tertiary)', marginTop: 10,
                lineHeight: 1.5, maxWidth: 360, margin: '10px auto 0',
              }}>
                {order.admin_comment}
              </div>
            )}
          </div>
        )}

        {/* ── Service Type ── */}
        <ConfirmSection delay={0.1} icon={<InboxOutlined />} title={t('newOrder.serviceType')}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 12,
            background: 'var(--accent-bg)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--accent-bg-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'var(--accent)',
            }}>
              <CategoryImage
                imageUrl={order.selected_category_detail?.image_url}
                icon={order.selected_category_detail?.icon || 'inbox'}
                size={28}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {localized(order.selected_category_detail?.name) || '—'}
              </div>
              {order.final_category_detail?.name && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  <CheckCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />
                  {t('orders.assigned')}: {localized(order.final_category_detail.name)}
                </div>
              )}
            </div>
          </div>
        </ConfirmSection>

        {/* ── Description ── */}
        {order.description && (
          <ConfirmSection delay={0.15} icon={<FileTextOutlined />} title={t('orders.description')}>
            <div style={{
              fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
              padding: '4px 0',
            }}>
              {order.description}
            </div>
            {order.cargo_details && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10,
                paddingTop: 10, borderTop: '1px solid var(--border-light)',
              }}>
                <InfoChip label={t('newOrder.cargoDetails')} value={order.cargo_details} />
              </div>
            )}
          </ConfirmSection>
        )}

        {/* ── Route ── */}
        {(pickupStops.length > 0 || destStops.length > 0) && (
          <ConfirmSection delay={0.2} icon={<EnvironmentOutlined />} title={hasDest ? t('newOrder.route') : t('newOrder.workLocation')}>
            {pickupStops.map((stop, idx) => (
              <div key={`p-${idx}`} style={{
                display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: hasDest ? '#10b98114' : 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <EnvironmentOutlined style={{
                    color: hasDest ? 'var(--success-color)' : 'var(--accent)', fontSize: 14,
                  }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {hasDest
                      ? (pickupStops.length > 1 ? `${t('orders.pickup')} ${idx + 1}` : t('orders.pickup'))
                      : t('orders.location')}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 2, wordBreak: 'break-word' }}>
                    {stop.address || stop.text || '—'}
                  </div>
                </div>
              </div>
            ))}

            {destStops.map((stop, idx) => (
              <div key={`d-${idx}`} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                marginBottom: idx < destStops.length - 1 ? 10 : 0,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#ef444414',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <EnvironmentOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {destStops.length > 1 ? `${t('orders.destination')} ${idx + 1}` : t('orders.destination')}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 2, wordBreak: 'break-word' }}>
                    {stop.address || stop.text || '—'}
                  </div>
                </div>
              </div>
            ))}

            {order.route_stops?.distance && (
              <div style={{
                marginTop: 12, paddingTop: 12,
                borderTop: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <CarOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {order.route_stops.distance >= 1000
                    ? `${(order.route_stops.distance / 1000).toFixed(1)} ${t('newOrder.km')}`
                    : `${Math.round(order.route_stops.distance)} m`}
                </span>
                {order.route_stops.duration && (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    ~ {order.route_stops.duration >= 3600
                      ? `${Math.floor(order.route_stops.duration / 3600)} ${t('newOrder.hr')} ${Math.round((order.route_stops.duration % 3600) / 60)} ${t('newOrder.min')}`
                      : `${Math.round(order.route_stops.duration / 60)} ${t('newOrder.min')}`}
                  </span>
                )}
              </div>
            )}

            {/* Map */}
            {mapMarkers.length > 0 && (
              <div style={{
                marginTop: 14,
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid var(--border-light)',
              }}>
                <MapView height={isDesktop ? 280 : 200} markers={mapMarkers} />
              </div>
            )}
          </ConfirmSection>
        )}

        {/* ── Schedule ── */}
        <ConfirmSection delay={0.25} icon={<CalendarOutlined />} title={t('newOrder.when')}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {t('orders.date')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                {order.requested_date || '—'}
              </div>
            </div>
            {order.requested_time && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {t('orders.time')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                  <ClockCircleOutlined style={{ marginRight: 6, fontSize: 13, color: 'var(--text-tertiary)' }} />
                  {order.requested_time}
                </div>
              </div>
            )}
          </div>
        </ConfirmSection>

        {/* ── Contact ── */}
        <ConfirmSection delay={0.3} icon={<UserOutlined />} title={t('newOrder.contactPerson')}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {t('orders.contact')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 3 }}>
                {order.contact_name || '—'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {t('auth.phone')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 3 }}>
                <PhoneOutlined style={{ marginRight: 6, fontSize: 12, color: 'var(--text-tertiary)' }} />
                {order.contact_phone || '—'}
              </div>
            </div>
          </div>
        </ConfirmSection>

        {/* ── Assigned vehicle ── */}
        {order.assigned_vehicle_detail && (
          <ConfirmSection delay={0.35} icon={<CarOutlined />} title={t('orders.assignedVehicle')}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 12,
              background: 'var(--accent-bg)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--accent-bg-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', fontSize: 18,
              }}>
                <CarOutlined />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {order.assigned_vehicle_detail.name}
                </div>
                {order.assigned_vehicle_detail.plate_number && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {t('orders.plate')}: {order.assigned_vehicle_detail.plate_number}
                  </div>
                )}
              </div>
            </div>
          </ConfirmSection>
        )}

        {/* ── Admin comment (non-terminal) ── */}
        {order.admin_comment && !isTerminal && (
          <ConfirmSection delay={0.4} icon={<FileTextOutlined />} title={t('orders.adminComment')}>
            <div style={{
              fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
              background: '#f59e0b10', borderRadius: 12, padding: '12px 14px',
              border: '1px solid #f59e0b25',
            }}>
              {order.admin_comment}
            </div>
          </ConfirmSection>
        )}

        {/* ── Photos ── */}
        {order.images?.length > 0 && (
          <ConfirmSection delay={0.45} icon={<CameraOutlined />} title={t('orders.photos')}>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {order.images.map((img) => (
                  <Image key={img.id} width={84} height={84} src={img.image}
                    style={{ objectFit: 'cover', borderRadius: 12 }} />
                ))}
              </div>
            </Image.PreviewGroup>
          </ConfirmSection>
        )}

        {/* ── Status history ── */}
        {order.status_history?.length > 0 && (
          <ConfirmSection delay={0.5} icon={<HistoryOutlined />} title={t('orders.statusHistory')}>
            <div style={{ position: 'relative' }}>
              {order.status_history.map((h, i) => {
                const dotColor = STATUS_BADGE_COLORS[h.new_status] || 'var(--text-placeholder)';
                const isLast = i === order.status_history.length - 1;
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 14, marginBottom: isLast ? 0 : 20,
                    alignItems: 'flex-start', position: 'relative',
                  }}>
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
                        fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                        lineHeight: 1, letterSpacing: -0.1,
                      }}>
                        {t('status.' + h.new_status) || h.new_status}
                      </div>
                      {h.comment && (
                        <div style={{
                          fontSize: 12, color: 'var(--text-secondary)', marginTop: 6,
                          lineHeight: 1.5,
                        }}>
                          {h.comment}
                        </div>
                      )}
                      <div style={{
                        fontSize: 11, color: 'var(--text-placeholder)', marginTop: 6,
                      }}>
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ConfirmSection>
        )}
      </div>

      {/* ── Sticky Cancel CTA ── */}
      {order.is_cancellable && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{
            margin: '0 auto', maxWidth: 1200,
            padding: isDesktop ? '20px 40px' : '16px 20px',
            paddingBottom: isDesktop
              ? 'calc(20px + env(safe-area-inset-bottom, 0px))'
              : 'calc(16px + env(safe-area-inset-bottom, 0px))',
          }}>
            <Button
              danger block onClick={handleCancel}
              icon={<CloseCircleOutlined />}
              style={{
                height: 52, borderRadius: 14, fontSize: 15, fontWeight: 700,
                boxShadow: 'none',
              }}
            >
              {t('orders.cancelOrder')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


function ConfirmSection({ children, delay = 0, icon, title }) {
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.md;
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 18,
      padding: isDesktop ? '32px 32px' : '22px 20px',
      marginBottom: isDesktop ? 24 : 16, boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-color)',
      animation: `fadeInUp 0.4s ease-out ${delay}s both`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 16, paddingBottom: 12,
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: 'var(--accent)',
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
          letterSpacing: 0.2, textTransform: 'uppercase',
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      background: 'var(--bg-tertiary)',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}:</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
