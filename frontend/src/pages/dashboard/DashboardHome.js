import React, { useEffect, useState } from 'react';
import { Button, Empty, Spin, Grid, Typography } from 'antd';
import {
  PlusCircleOutlined, FileTextOutlined, ClockCircleOutlined,
  CheckCircleOutlined, RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';

const { Title, Text } = Typography;
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );

  const statCards = [
    { title: 'Total Orders', value: stats?.total_orders, icon: <FileTextOutlined />, color: 'var(--accent)' },
    { title: 'Active', value: stats?.active_orders, icon: <ClockCircleOutlined />, color: '#f59e0b' },
    { title: 'Completed', value: stats?.completed_orders, icon: <CheckCircleOutlined />, color: '#10b981' },
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
          My Dashboard
        </Title>
        <Button
          type="primary"
          icon={<PlusCircleOutlined />}
          size={isMobile ? 'large' : 'middle'}
          onClick={() => navigate('/dashboard/orders/new')}
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 10, height: isMobile ? 44 : 40,
            fontWeight: 600, boxShadow: 'var(--shadow-sm)',
          }}
        >
          New Order
        </Button>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 28,
      }}>
        {statCards.map((s, i) => (
          <div key={i} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            padding: isMobile ? 14 : 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
              <div style={{
                width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: 12,
                background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? 18 : 22, color: s.color, flexShrink: 0,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{
                  fontSize: isMobile ? 22 : 28, fontWeight: 800,
                  color: s.color, lineHeight: 1.1, letterSpacing: '-0.02em',
                }}>
                  {s.value || 0}
                </div>
                <div style={{
                  fontSize: isMobile ? 11 : 13, color: 'var(--text-tertiary)',
                  fontWeight: 500, marginTop: 2,
                }}>
                  {s.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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
            Recent Orders
          </Text>
          <Button
            type="link"
            onClick={() => navigate('/dashboard/orders')}
            style={{ color: 'var(--accent)', fontWeight: 600, padding: 0 }}
          >
            View All
          </Button>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Empty description="No orders yet" style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate('/dashboard/orders/new')}
                style={{
                  background: 'var(--accent)', borderColor: 'var(--accent)',
                  borderRadius: 12, height: 48, fontWeight: 700, fontSize: 15,
                }}
              >
                Create Your First Order
              </Button>
            </Empty>
          </div>
        ) : (
          recentOrders.map((order, index) => (
            <div
              key={order.id}
              onClick={() => navigate(`/dashboard/orders/${order.id}`)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: isMobile ? '14px 16px' : '14px 24px',
                cursor: 'pointer',
                borderBottom: index < recentOrders.length - 1 ? '1px solid var(--border-color)' : 'none',
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
                  {order.requested_date} · {(typeof order.selected_category_name === 'object' ? (order.selected_category_name?.en || '') : order.selected_category_name) || 'No category'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <StatusBadge status={order.status} />
                {isMobile && <RightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 11 }} />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
