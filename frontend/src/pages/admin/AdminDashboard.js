import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Spin, Button, Grid, Progress } from 'antd';
import {
  TeamOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, PlusCircleOutlined, UserOutlined,
  RightOutlined, AppstoreOutlined, PlusOutlined, CarOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isMobile = !screens.md;

  useEffect(() => {
    Promise.all([
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
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  const totalOrders = (stats?.new_orders || 0) + (stats?.active_orders || 0) + (stats?.completed_orders || 0) + (stats?.rejected_orders || 0);

  const statCards = [
    { title: t('adminDash.totalUsers'), value: stats?.total_users, icon: <TeamOutlined />, color: '#1677ff' },
    { title: t('adminDash.newOrders'), value: stats?.new_orders, icon: <PlusCircleOutlined />, color: '#fa8c16' },
    { title: t('adminDash.inProgress'), value: stats?.active_orders, icon: <ClockCircleOutlined />, color: '#13c2c2' },
    { title: t('adminDash.completed'), value: stats?.completed_orders, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: t('adminDash.vehicles'), value: vehicleCount, icon: <CarOutlined />, color: '#722ed1' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('adminDash.dashboard')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/orders')}>
          {t('adminDash.viewOrders')}
        </Button>
      </div>

      {/* Stat cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={8} md={6} lg={4} key={i}>
            <Card size="small" bodyStyle={{ padding: isMobile ? '12px' : '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${s.color}14`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: s.color,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                    {s.value || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>{s.title}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Order distribution + quick actions */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
          <Card title={t('adminDash.orderDistribution')} size="small">
            {totalOrders > 0 ? (
              <div>
                {[
                  { label: t('status.new'), value: stats?.new_orders || 0, color: '#fa8c16' },
                  { label: t('status.in_progress'), value: stats?.active_orders || 0, color: '#13c2c2' },
                  { label: t('status.completed'), value: stats?.completed_orders || 0, color: '#52c41a' },
                  { label: t('status.rejected'), value: stats?.rejected_orders || 0, color: '#ff4d4f' },
                ].map((item) => (
                  <div key={item.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13 }}>{item.label}</Text>
                      <Text strong style={{ fontSize: 13 }}>{item.value}</Text>
                    </div>
                    <Progress
                      percent={Math.round((item.value / totalOrders) * 100)}
                      strokeColor={item.color}
                      showInfo={false}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">{t('adminDash.noOrdersYet')}</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={t('adminDash.quickActions')} size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: t('adminDash.newOrders'), icon: <PlusCircleOutlined />, color: '#fa8c16', path: '/admin/orders?status=new' },
                { label: t('adminDash.inProgress'), icon: <ClockCircleOutlined />, color: '#13c2c2', path: '/admin/orders?status=in_progress' },
                { label: t('adminDash.vehicles'), icon: <CarOutlined />, color: '#722ed1', path: '/admin/vehicles' },
                { label: t('nav.analytics'), icon: <BarChartOutlined />, color: '#eb2f96', path: '/admin/analytics' },
                { label: t('nav.categories'), icon: <AppstoreOutlined />, color: '#595959', path: '/admin/categories' },
              ].map((action) => (
                <div
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  style={{
                    padding: '14px 12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18, color: action.color }}>{action.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{action.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent orders */}
      <Card
        title={t('adminDash.recentOrders')}
        extra={<Button type="link" onClick={() => navigate('/admin/orders')}>{t('common.viewAll')}</Button>}
        bodyStyle={{ padding: isMobile ? '8px 0' : undefined }}
      >
        <List
          dataSource={recentOrders}
          renderItem={(order) => (
            <List.Item
              style={{ cursor: 'pointer', padding: isMobile ? '10px 16px' : '12px 24px' }}
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={order.status} />
                  {isMobile && <RightOutlined style={{ color: '#ccc', fontSize: 12 }} />}
                </div>
              }
            >
              <List.Item.Meta
                title={<span style={{ fontSize: 14 }}>#{order.id} — {order.pickup_location}</span>}
                description={`${order.requested_date} · ${order.selected_category_name || '—'}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
