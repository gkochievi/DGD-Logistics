import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button, List, Typography, Empty, Spin, Grid } from 'antd';
import {
  PlusCircleOutlined, FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';

const { Title } = Typography;
const { useBreakpoint } = Grid;

export default function DashboardHome() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isMobile = !screens.md;

  useEffect(() => {
    Promise.all([
      api.get('/auth/profile/stats/'),
      api.get('/orders/?page=1'),
    ]).then(([statsRes, ordersRes]) => {
      setStats(statsRes.data);
      const results = ordersRes.data.results || ordersRes.data;
      setRecentOrders(Array.isArray(results) ? results.slice(0, 5) : []);
    }).catch(() => { /* profile/orders may fail if token expired, handled by interceptor */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>My Dashboard</Title>
        <Button type="primary" icon={<PlusCircleOutlined />} size={isMobile ? 'large' : 'middle'}
          onClick={() => navigate('/dashboard/orders/new')} style={isMobile ? { height: 44 } : {}}>
          New Order
        </Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { title: 'Total Orders', value: stats?.total_orders, icon: <FileTextOutlined />, color: '#1677ff' },
          { title: 'Active', value: stats?.active_orders, icon: <ClockCircleOutlined />, color: '#fa8c16' },
          { title: 'Completed', value: stats?.completed_orders, icon: <CheckCircleOutlined />, color: '#52c41a' },
        ].map((s, i) => (
          <Col xs={8} sm={8} key={i}>
            <Card size="small" bodyStyle={{ padding: isMobile ? 12 : 16 }}>
              <Statistic
                title={<span style={{ fontSize: isMobile ? 11 : 14 }}>{s.title}</span>}
                value={s.value || 0}
                prefix={s.icon}
                valueStyle={{ color: s.color, fontSize: isMobile ? 20 : 24 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="Recent Orders"
        extra={<Button type="link" onClick={() => navigate('/dashboard/orders')}>View All</Button>}
        bodyStyle={{ padding: isMobile ? '8px 0' : undefined }}
      >
        {recentOrders.length === 0 ? (
          <Empty description="No orders yet" style={{ padding: 24 }}>
            <Button type="primary" size="large" onClick={() => navigate('/dashboard/orders/new')} style={{ height: 48 }}>
              Create Your First Order
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={recentOrders}
            renderItem={(order) => (
              <List.Item
                style={{ cursor: 'pointer', padding: isMobile ? '12px 16px' : '12px 24px' }}
                onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                extra={<StatusBadge status={order.status} />}
              >
                <List.Item.Meta
                  title={<span style={{ fontSize: isMobile ? 14 : 14 }}>#{order.id} — {order.pickup_location}</span>}
                  description={`${order.requested_date} · ${order.selected_category_name || 'No category'}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
