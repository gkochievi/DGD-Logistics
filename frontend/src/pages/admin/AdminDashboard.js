import React, { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Typography, List, Spin, Button, Grid, Progress } from 'antd';
import {
  TeamOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, PlusCircleOutlined,
  RightOutlined, AppstoreOutlined, PlusOutlined, CarOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLang } from '../../contexts/LanguageContext';
import { useRealtimeRefresh } from '../../contexts/NotificationContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t, lang } = useLang();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isMobile = !screens.md;

  const loadDashboard = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    return Promise.all([
      api.get('/auth/admin/dashboard/'),
      api.get('/orders/admin/?page=1'),
      api.get('/vehicles/admin/'),
    ]).then(([statsRes, ordersRes, vehiclesRes]) => {
      setStats(statsRes.data);
      const results = ordersRes.data.results || ordersRes.data;
      setRecentOrders(Array.isArray(results) ? results.slice(0, 8) : []);
      const vResults = vehiclesRes.data.results || vehiclesRes.data;
      setVehicleCount(Array.isArray(vResults) ? vResults.length : 0);
    }).catch(() => {})
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useRealtimeRefresh(useCallback(() => {
    loadDashboard({ silent: true });
  }, [loadDashboard]));

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );

  const totalOrders = (stats?.new_orders || 0) + (stats?.active_orders || 0) + (stats?.completed_orders || 0) + (stats?.rejected_orders || 0);

  const statCards = [
    { title: t('adminDash.totalUsers'), value: stats?.total_users, icon: <TeamOutlined />, color: 'var(--accent)' },
    { title: t('adminDash.newOrders'), value: stats?.new_orders, icon: <PlusCircleOutlined />, color: '#f59e0b' },
    { title: t('adminDash.inProgress'), value: stats?.active_orders, icon: <ClockCircleOutlined />, color: '#06b6d4' },
    { title: t('adminDash.completed'), value: stats?.completed_orders, icon: <CheckCircleOutlined />, color: '#10b981' },
    { title: t('adminDash.vehicles'), value: vehicleCount, icon: <CarOutlined />, color: 'var(--accent)' },
  ];

  const distributionItems = [
    { label: t('status.new'), value: stats?.new_orders || 0, color: '#f59e0b' },
    { label: t('status.in_progress'), value: stats?.active_orders || 0, color: '#06b6d4' },
    { label: t('status.completed'), value: stats?.completed_orders || 0, color: '#10b981' },
    { label: t('status.rejected'), value: stats?.rejected_orders || 0, color: '#ef4444' },
  ];

  const quickActions = [
    { label: t('adminDash.newOrders'), icon: <PlusCircleOutlined />, color: '#f59e0b', path: '/admin/orders?status=new' },
    { label: t('adminDash.inProgress'), icon: <ClockCircleOutlined />, color: '#06b6d4', path: '/admin/orders?status=in_progress' },
    { label: t('adminDash.vehicles'), icon: <CarOutlined />, color: 'var(--accent)', path: '/admin/vehicles' },
    { label: t('nav.analytics'), icon: <BarChartOutlined />, color: '#ec4899', path: '/admin/analytics' },
    { label: t('nav.categories'), icon: <AppstoreOutlined />, color: '#64748b', path: '/admin/categories' },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <Title level={3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          {t('adminDash.dashboard')}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/orders')}
          style={{
            background: 'var(--accent)',
            borderColor: 'var(--accent)',
            borderRadius: 10,
            height: 40,
            fontWeight: 600,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {t('adminDash.viewOrders')}
        </Button>
      </div>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={8} md={6} lg={4} key={i}>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 16,
              padding: isMobile ? 14 : 20,
              transition: 'all 0.2s ease',
              cursor: 'default',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: s.color, flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: isMobile ? 22 : 26, fontWeight: 800,
                    color: s.color, lineHeight: 1.1, letterSpacing: '-0.02em',
                  }}>
                    {s.value || 0}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-tertiary)',
                    fontWeight: 500, marginTop: 2,
                  }}>
                    {s.title}
                  </div>
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Order distribution + quick actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={24} md={12}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            padding: 24,
            height: '100%',
          }}>
            <Text style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.02em', display: 'block', marginBottom: 20,
            }}>
              {t('adminDash.orderDistribution')}
            </Text>
            {totalOrders > 0 ? (
              <div>
                {distributionItems.map((item) => (
                  <div key={item.label} style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 6,
                    }}>
                      <Text style={{
                        fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
                      }}>
                        {item.label}
                      </Text>
                      <Text style={{
                        fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                      }}>
                        {item.value}
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round((item.value / totalOrders) * 100)}
                      strokeColor={item.color}
                      trailColor="var(--bg-secondary)"
                      showInfo={false}
                      size="small"
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Text style={{ color: 'var(--text-tertiary)' }}>{t('adminDash.noOrdersYet')}</Text>
            )}
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            padding: 24,
            height: '100%',
          }}>
            <Text style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.02em', display: 'block', marginBottom: 20,
            }}>
              {t('adminDash.quickActions')}
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {quickActions.map((action) => (
                <div
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="card-interactive"
                  style={{
                    padding: '16px 14px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--bg-primary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `color-mix(in srgb, ${action.color} 10%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: action.color, flexShrink: 0,
                  }}>
                    {action.icon}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}>
                    {action.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>

      {/* Recent orders */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
        }}>
          <Text style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            {t('adminDash.recentOrders')}
          </Text>
          <Button
            type="link"
            onClick={() => navigate('/admin/orders')}
            style={{ color: 'var(--accent)', fontWeight: 600, padding: 0 }}
          >
            {t('common.viewAll')}
          </Button>
        </div>
        <List
          dataSource={recentOrders}
          renderItem={(order) => (
            <div
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: isMobile ? '14px 16px' : '14px 24px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                  marginBottom: 3,
                }}>
                  #{order.id} — {order.pickup_location}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {order.requested_date} · {(typeof order.selected_category_name === 'object' ? (order.selected_category_name[lang] || order.selected_category_name.en || '') : order.selected_category_name) || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <StatusBadge status={order.status} />
                {isMobile && <RightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 11 }} />}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
