import React, { useEffect, useState } from 'react';
import { Typography, Spin, Input } from 'antd';
import {
  RocketOutlined, RightOutlined, ClockCircleOutlined,
  SearchOutlined, ArrowRightOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { STATUS_CONFIG } from '../../utils/status';
import { getCategoryIcon } from '../../utils/categoryIcons';

const { Text } = Typography;

const STATUS_BADGE_COLORS = {
  new: '#6366f1',
  under_review: '#f59e0b',
  approved: '#06b6d4',
  in_progress: '#3b82f6',
  completed: '#10b981',
  rejected: '#ef4444',
  cancelled: '#8e93ab',
};

export default function AppHome() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catSearch, setCatSearch] = useState('');
  const [showAllCats, setShowAllCats] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/categories/'),
      api.get('/orders/active/'),
    ]).then(([catRes, ordersRes]) => {
      const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data.results || [];
      setCategories(cats);
      const orders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || [];
      setActiveOrders(orders);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header with gradient */}
      <div style={{
        padding: '24px 20px 28px',
        paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
        background: 'var(--header-gradient)',
        color: '#fff',
        borderRadius: '0 0 28px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20, width: 100, height: 100,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500, letterSpacing: 0.3 }}>
            {t('home.good')} {t('home.greeting.' + getGreeting())}
          </Text>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2, letterSpacing: -0.3 }}>
            {user?.first_name || 'there'}
          </div>

          {/* Quick action button */}
          <div
            onClick={() => navigate('/app/order/new')}
            style={{
              marginTop: 20,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 16,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.18)',
              transition: 'background 0.2s ease',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              <ThunderboltOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{t('home.searchPrompt')}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 1 }}>{t('home.tapToStart')}</div>
            </div>
            <ArrowRightOutlined style={{ fontSize: 14, opacity: 0.6 }} />
          </div>
        </div>
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="animate-fade-in-up" style={{ padding: '20px 20px 0' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <ClockCircleOutlined style={{ color: 'var(--warning-color)' }} />
              {t('home.activeOrders')}
            </div>
            {activeOrders.length > 3 && (
              <span
                onClick={() => navigate('/app/orders')}
                style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
              >
                {t('common.viewAll')}
              </span>
            )}
          </div>
          {activeOrders.slice(0, 3).map((order, idx) => {
            const badgeColor = STATUS_BADGE_COLORS[order.status] || '#6366f1';
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/app/orders/${order.id}`)}
                className="card-interactive"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: 'var(--shadow-sm)',
                  animation: `fadeInUp 0.4s ease-out ${idx * 0.05}s both`,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 13,
                  background: `${order.selected_category_color || 'var(--accent)'}14`,
                  display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: order.selected_category_color || 'var(--accent)',
                }}>
                  {getCategoryIcon(order.selected_category_icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {order.pickup_location}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    #{order.id} · {order.requested_date}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: badgeColor,
                  background: `${badgeColor}14`,
                  padding: '4px 10px',
                  borderRadius: 8,
                  whiteSpace: 'nowrap',
                }}>
                  {t('status.' + order.status) || order.status}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transport categories grid */}
      <div className="animate-fade-in-up" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('home.selectType')}
          </div>
          {categories.length > 6 && (
            <span
              onClick={() => setShowAllCats(!showAllCats)}
              style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
            >
              {showAllCats ? t('home.showLess') : t('home.all', { count: categories.length })}
            </span>
          )}
        </div>

        {showAllCats && categories.length > 6 && (
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-placeholder)' }} />}
            placeholder={t('home.searchType')}
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            allowClear
            style={{ marginBottom: 12, borderRadius: 14, height: 44, background: 'var(--input-bg)' }}
          />
        )}

        {(() => {
          let filtered = categories;
          if (catSearch) {
            const q = catSearch.toLowerCase();
            filtered = categories.filter(
              (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
            );
          }
          const visible = showAllCats ? filtered : filtered.slice(0, 6);

          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}>
              {visible.map((cat, idx) => {
                const color = cat.color || 'var(--accent)';
                return (
                  <div
                    key={cat.id}
                    onClick={() => navigate(`/app/order/new?category=${cat.id}`)}
                    className="card-interactive"
                    style={{
                      background: 'var(--card-bg)',
                      borderRadius: 16,
                      padding: '18px 8px 14px',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      animation: `fadeInUp 0.4s ease-out ${idx * 0.04}s both`,
                    }}
                  >
                    <div style={{
                      width: 50, height: 50, borderRadius: 15,
                      background: `${color}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: color,
                      transition: 'transform 0.2s ease',
                    }}>
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                      textAlign: 'center', lineHeight: 1.3,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {cat.name}
                    </div>
                  </div>
                );
              })}

              {/* "Other" card */}
              <div
                onClick={() => navigate('/app/order/new')}
                className="card-interactive"
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: 16,
                  padding: '18px 8px 14px',
                  border: '1px dashed var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{
                  width: 50, height: 50, borderRadius: 15,
                  background: 'var(--badge-muted-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, color: 'var(--text-tertiary)',
                }}>
                  <RocketOutlined />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {t('home.other')}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* How it works */}
      <div style={{ padding: '8px 20px 30px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
          {t('home.howItWorks')}
        </div>
        {[
          { num: '1', title: t('home.step1Title'), desc: t('home.step1Desc'), color: '#6366f1' },
          { num: '2', title: t('home.step2Title'), desc: t('home.step2Desc'), color: '#3b82f6' },
          { num: '3', title: t('home.step3Title'), desc: t('home.step3Desc'), color: '#10b981' },
        ].map((step, i) => (
          <div key={i} style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            marginBottom: 14,
            animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `${step.color}14`, color: step.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, flexShrink: 0,
            }}>
              {step.num}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{step.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
