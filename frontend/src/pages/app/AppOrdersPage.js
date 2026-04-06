import React, { useEffect, useState } from 'react';
import { Spin, Empty } from 'antd';
import {
  RightOutlined, ClockCircleOutlined,
  CheckCircleOutlined, FileTextOutlined, PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';
import { STATUS_CONFIG, URGENCY_CONFIG } from '../../utils/status';
import { getCategoryIcon } from '../../utils/categoryIcons';

const STATUS_BADGE_COLORS = {
  new: '#6366f1',
  under_review: '#f59e0b',
  approved: '#06b6d4',
  in_progress: '#3b82f6',
  completed: '#10b981',
  rejected: '#ef4444',
  cancelled: '#8e93ab',
};

export default function AppOrdersPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [activeTab]); // eslint-disable-line

  const fetchOrders = () => {
    setLoading(true);
    const endpoint = activeTab === 'active' ? '/orders/active/' : '/orders/';
    const params = activeTab === 'history' ? { status: 'completed' } : {};
    api.get(endpoint, { params }).then(({ data }) => {
      const results = Array.isArray(data) ? data : data.results || [];
      setOrders(results);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  const tabs = [
    { key: 'active', label: t('orders.activeTab'), icon: <ClockCircleOutlined /> },
    { key: 'all', label: t('orders.allTab'), icon: <FileTextOutlined /> },
    { key: 'history', label: t('orders.completedTab'), icon: <CheckCircleOutlined /> },
  ];

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 0',
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: -0.5 }}>
          {t('orders.myOrders')}
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0,
          background: 'var(--bg-tertiary)',
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
        }}>
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 0',
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-tertiary)',
                background: activeTab === tab.key ? 'var(--card-bg)' : 'transparent',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* Order list */}
      <div style={{ padding: '4px 16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        ) : orders.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--card-bg)', borderRadius: 20,
            marginTop: 8, boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'var(--accent-bg)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: 'var(--accent)', marginBottom: 16,
            }}>
              <FileTextOutlined />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              {activeTab === 'active'
                ? t('orders.noActive')
                : activeTab === 'history'
                ? t('orders.noCompleted')
                : t('orders.noOrders')}
            </div>
            {activeTab !== 'history' && (
              <div
                onClick={() => navigate('/app/order/new')}
                style={{
                  marginTop: 16, color: '#fff', fontWeight: 600,
                  fontSize: 14, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--header-gradient)',
                  padding: '10px 20px', borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                }}
              >
                <PlusOutlined /> {t('orders.placeFirst')}
              </div>
            )}
          </div>
        ) : (
          orders.map((order, idx) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/app/orders/${order.id}`)}
              t={t}
              delay={idx * 0.04}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, t, delay = 0 }) {
  const badgeColor = STATUS_BADGE_COLORS[order.status] || '#8e93ab';

  return (
    <div
      onClick={onClick}
      className="card-interactive"
      style={{
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)',
        animation: `fadeInUp 0.4s ease-out ${delay}s both`,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `${order.selected_category_color || 'var(--accent)'}12`,
        display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color: order.selected_category_color || 'var(--accent)', flexShrink: 0,
      }}>
        {getCategoryIcon(order.selected_category_icon)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {order.pickup_location}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
          #{order.id} · {order.requested_date} · {order.selected_category_name || ''}
        </div>
        {(order.urgency === 'urgent' || order.urgency === 'high') && (
          <div style={{
            marginTop: 5,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            color: order.urgency === 'urgent' ? '#ef4444' : '#f59e0b',
            background: order.urgency === 'urgent' ? '#ef444414' : '#f59e0b14',
            padding: '2px 8px', borderRadius: 6,
          }}>
            {t('urgency.' + order.urgency)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: badgeColor,
          background: `${badgeColor}14`,
          padding: '4px 10px',
          borderRadius: 8,
        }}>
          {t('status.' + order.status) || order.status}
        </div>
        <RightOutlined style={{ color: 'var(--text-placeholder)', fontSize: 11 }} />
      </div>
    </div>
  );
}
