import React, { useCallback, useEffect, useState } from 'react';
import {
  Table, Select, Button, Input, Typography, Space, Grid, Empty, Badge,
} from 'antd';
import { EyeOutlined, SearchOutlined, RightOutlined, FilterOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_OPTIONS, URGENCY_OPTIONS } from '../../utils/status';
import { useLang } from '../../contexts/LanguageContext';
import { useRealtimeRefresh } from '../../contexts/NotificationContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function AdminOrdersPage({ historyMode = false }) {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t, lang } = useLang();
  const localized = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v[lang] || v['en'] || '';
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/categories/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    });
  }, []);

  const fetchOrders = useCallback((page = 1, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    const params = { page };

    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const category = searchParams.get('category');
    const userId = searchParams.get('user_id');

    if (status) params.status = status;
    if (urgency) params.urgency = urgency;
    if (category) params.selected_category = category;
    if (userId) params.user_id = userId;
    if (search) params.search = search;

    if (historyMode) {
      if (!status) params.status = 'completed';
    }

    return api.get('/orders/admin/', { params }).then(({ data }) => {
      const results = data.results || data;
      setOrders(Array.isArray(results) ? results : []);
      setPagination((p) => ({ ...p, current: page, total: data.count || results.length }));
    }).catch(() => {})
      .finally(() => { if (!silent) setLoading(false); });
  }, [searchParams, search, historyMode]);

  useEffect(() => { fetchOrders(); }, [searchParams, historyMode]); // eslint-disable-line

  useRealtimeRefresh(useCallback(() => {
    fetchOrders(pagination.current, { silent: true });
  }, [fetchOrders, pagination.current]));

  const updateFilter = (key, val) => {
    const params = Object.fromEntries(searchParams.entries());
    if (val) params[key] = val; else delete params[key];
    setSearchParams(params);
  };

  const isMobile = !screens.md;

  const columns = [
    {
      title: 'ID', dataIndex: 'id', width: 90,
      render: (id, record) => (
        <span style={{ fontWeight: 600, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {record.is_unread && (
            <span
              title={t('notifications.unread')}
              style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.18)',
              }}
            />
          )}
          #{id}
        </span>
      ),
    },
    {
      title: t('orders.pickup'), dataIndex: 'pickup_location', ellipsis: true,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    { title: t('adminOrders.category'), dataIndex: 'selected_category_name', width: 140, ellipsis: true, render: (v) => localized(v) },
    { title: t('orders.date'), dataIndex: 'requested_date', width: 110 },
    { title: t('adminOrders.status'), dataIndex: 'status', width: 130, render: (s) => <StatusBadge status={s} /> },
    { title: t('adminOrders.urgencyLabel'), dataIndex: 'urgency', width: 100, render: (u) => <UrgencyBadge urgency={u} /> },
    {
      title: '', width: 50,
      render: (_, r) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/admin/orders/${r.id}`)}
          style={{ color: 'var(--accent)' }}
        />
      ),
    },
  ];

  const hasMore = pagination.current * pagination.pageSize < pagination.total;

  return (
    <div className="page-enter">
      <Title level={3} style={{
        margin: '0 0 24px 0', fontWeight: 800,
        letterSpacing: '-0.02em', color: 'var(--text-primary)',
      }}>
        {historyMode ? t('adminOrders.orderHistory') : t('adminOrders.activeOrders')}
      </Title>

      {/* User filter banner */}
      {searchParams.get('user_id') && (
        <div style={{
          background: 'var(--accent-bg, rgba(0, 184, 86, 0.08))',
          border: '1px solid var(--accent)',
          borderRadius: 12,
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
            <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              {t('adminOrders.showingOrdersFor', { name: searchParams.get('user_name') || `#${searchParams.get('user_id')}` })}
            </Text>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => {
              const params = Object.fromEntries(searchParams.entries());
              delete params.user_id;
              delete params.user_name;
              setSearchParams(params);
            }}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </div>
      )}

      {/* Filter bar */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 14,
        padding: isMobile ? '14px 16px' : '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: 12, color: 'var(--text-tertiary)',
        }}>
          <FilterOutlined style={{ fontSize: 13 }} />
          <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Filters
          </Text>
        </div>
        <Space wrap size={isMobile ? 'small' : 'middle'} style={{ width: '100%' }}>
          <Input
            placeholder={t('common.search')}
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            allowClear
            style={{
              width: isMobile ? '100%' : 200,
              borderRadius: 10,
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchOrders()}
            size={isMobile ? 'large' : 'middle'}
          />
          <Select
            placeholder={t('adminOrders.status')}
            allowClear
            style={{ width: isMobile ? 120 : 150, borderRadius: 10 }}
            value={searchParams.get('status') || undefined}
            onChange={(val) => updateFilter('status', val)}
            options={STATUS_OPTIONS}
          />
          <Select
            placeholder={t('adminOrders.urgencyLabel')}
            allowClear
            style={{ width: isMobile ? 110 : 130 }}
            value={searchParams.get('urgency') || undefined}
            onChange={(val) => updateFilter('urgency', val)}
            options={URGENCY_OPTIONS}
          />
          <Select
            placeholder={t('adminOrders.category')}
            allowClear
            style={{ width: isMobile ? 140 : 170 }}
            value={searchParams.get('category') || undefined}
            onChange={(val) => updateFilter('category', val)}
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          />
        </Space>
      </div>

      {/* Content */}
      {isMobile ? (
        <>
          {loading && orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
              {t('common.loading')}
            </div>
          ) : orders.length === 0 ? (
            <Empty description={t('adminOrders.noOrdersFound')} />
          ) : (
            <>
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${order.is_unread ? 'var(--accent)' : 'var(--border-color)'}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 8,
                  }}>
                    <Text style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {order.is_unread && (
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.18)',
                        }} />
                      )}
                      #{order.id}
                    </Text>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 500,
                    color: 'var(--text-primary)', marginBottom: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {order.pickup_location}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {order.requested_date} · {localized(order.selected_category_name) || '—'} · <UrgencyBadge urgency={order.urgency} />
                    </Text>
                    <RightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 11 }} />
                  </div>
                </div>
              ))}
              {hasMore && (
                <Button
                  block
                  loading={loading}
                  onClick={() => fetchOrders(pagination.current + 1)}
                  style={{
                    marginTop: 12, height: 46, borderRadius: 12,
                    fontWeight: 600, border: '1px solid var(--border-color)',
                  }}
                >
                  {t('common.loadMore')}
                </Button>
              )}
            </>
          )}
        </>
      ) : (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{
              ...pagination,
              onChange: fetchOrders,
              showSizeChanger: false,
              style: { padding: '0 16px' },
            }}
            onRow={(record) => ({
              onClick: () => navigate(`/admin/orders/${record.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      )}
    </div>
  );
}
