import React, { useEffect, useState } from 'react';
import {
  Card, Table, Select, Button, Input, Typography, Space, Grid, Empty,
} from 'antd';
import { EyeOutlined, SearchOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_OPTIONS, URGENCY_OPTIONS } from '../../utils/status';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function AdminOrdersPage({ historyMode = false }) {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t } = useLang();
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

  const fetchOrders = (page = 1) => {
    setLoading(true);
    const params = { page };

    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const category = searchParams.get('category');

    if (status) params.status = status;
    if (urgency) params.urgency = urgency;
    if (category) params.selected_category = category;
    if (search) params.search = search;

    if (historyMode) {
      if (!status) params.status = 'completed';
    }

    api.get('/orders/admin/', { params }).then(({ data }) => {
      const results = data.results || data;
      setOrders(Array.isArray(results) ? results : []);
      setPagination((p) => ({ ...p, current: page, total: data.count || results.length }));
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [searchParams, historyMode]); // eslint-disable-line

  const updateFilter = (key, val) => {
    const params = Object.fromEntries(searchParams.entries());
    if (val) params[key] = val; else delete params[key];
    setSearchParams(params);
  };

  const isMobile = !screens.md;

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, render: (id) => `#${id}` },
    { title: t('orders.pickup'), dataIndex: 'pickup_location', ellipsis: true },
    { title: t('adminOrders.category'), dataIndex: 'selected_category_name', width: 140, ellipsis: true },
    { title: t('orders.date'), dataIndex: 'requested_date', width: 110 },
    { title: t('adminOrders.status'), dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
    { title: t('adminOrders.urgencyLabel'), dataIndex: 'urgency', width: 90, render: (u) => <UrgencyBadge urgency={u} /> },
    {
      title: '', width: 50,
      render: (_, r) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/admin/orders/${r.id}`)} />
      ),
    },
  ];

  const hasMore = pagination.current * pagination.pageSize < pagination.total;

  return (
    <div>
      <Title level={4}>{historyMode ? t('adminOrders.orderHistory') : t('adminOrders.activeOrders')}</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={isMobile ? 'small' : 'middle'} style={{ width: '100%' }}>
          <Input
            placeholder={t('common.search')} prefix={<SearchOutlined />} allowClear
            style={{ width: isMobile ? '100%' : 180 }} value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchOrders()}
            size={isMobile ? 'large' : 'middle'}
          />
          <Select placeholder={t('adminOrders.status')} allowClear style={{ width: isMobile ? 110 : 140 }}
            value={searchParams.get('status') || undefined}
            onChange={(val) => updateFilter('status', val)} options={STATUS_OPTIONS} />
          <Select placeholder={t('adminOrders.urgencyLabel')} allowClear style={{ width: isMobile ? 100 : 120 }}
            value={searchParams.get('urgency') || undefined}
            onChange={(val) => updateFilter('urgency', val)} options={URGENCY_OPTIONS} />
          <Select placeholder={t('adminOrders.category')} allowClear style={{ width: isMobile ? 130 : 160 }}
            value={searchParams.get('category') || undefined}
            onChange={(val) => updateFilter('category', val)}
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Space>
      </Card>

      {isMobile ? (
        <>
          {loading && orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>{t('common.loading')}</div>
          ) : orders.length === 0 ? (
            <Empty description={t('adminOrders.noOrdersFound')} />
          ) : (
            <>
              {orders.map((order) => (
                <Card key={order.id} size="small" style={{ marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text strong>#{order.id}</Text>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{order.pickup_location}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {order.requested_date} · {order.selected_category_name || '—'} · <UrgencyBadge urgency={order.urgency} />
                    </Text>
                    <RightOutlined style={{ color: '#ccc', fontSize: 12 }} />
                  </div>
                </Card>
              ))}
              {hasMore && (
                <Button
                  block
                  style={{ marginTop: 8, height: 44 }}
                  loading={loading}
                  onClick={() => fetchOrders(pagination.current + 1)}
                >
                  {t('common.loadMore')}
                </Button>
              )}
            </>
          )}
        </>
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} size="middle"
            pagination={{ ...pagination, onChange: fetchOrders, showSizeChanger: false }} />
        </Card>
      )}
    </div>
  );
}
