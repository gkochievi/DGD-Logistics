import React, { useCallback, useEffect, useState } from 'react';
import {
  Table, Select, Button, Input, Typography, Space, Grid, Empty, Badge, DatePicker, TimePicker,
  Modal, message,
} from 'antd';
import {
  EyeOutlined, SearchOutlined, RightOutlined, FilterOutlined, UserOutlined,
  CloseOutlined, DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
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
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportRange, setExportRange] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [rowExportingId, setRowExportingId] = useState(null);

  useEffect(() => {
    api.get('/services/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    });
    api.get('/vehicles/admin/').then(({ data }) => {
      const results = data.results || data;
      setVehicles(Array.isArray(results) ? results : []);
    }).catch(() => {});
  }, []);

  const fetchOrders = useCallback((page = 1, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    const params = { page };

    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const service = searchParams.get('service');
    const userId = searchParams.get('user_id');
    const requestedDateFrom = searchParams.get('requested_date_from');
    const requestedDateTo = searchParams.get('requested_date_to');
    const requestedTime = searchParams.get('requested_time');
    const vehicleId = searchParams.get('vehicle');

    if (status) params.status = status;
    if (urgency) params.urgency = urgency;
    if (service) params.selected_service = service;
    if (userId) params.user_id = userId;
    if (requestedDateFrom) params.requested_date_from = requestedDateFrom;
    if (requestedDateTo) params.requested_date_to = requestedDateTo;
    if (requestedTime) params.requested_time = requestedTime;
    if (vehicleId) params.assigned_vehicle = vehicleId;
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

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const filenameFromHeaders = (headers, fallback) => {
    const disposition = headers?.['content-disposition'] || '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    return match ? match[1] : fallback;
  };

  const handleExportOrders = async () => {
    const params = {};
    if (exportRange && exportRange[0] && exportRange[1]) {
      params.date_from = exportRange[0].format('YYYY-MM-DD');
      params.date_to = exportRange[1].format('YYYY-MM-DD');
    }
    if (historyMode) params.status = searchParams.get('status') || 'completed';
    setExporting(true);
    try {
      const resp = await api.get('/orders/admin/export/', { params, responseType: 'blob' });
      const filename = filenameFromHeaders(resp.headers, `orders_${dayjs().format('YYYYMMDD_HHmm')}.csv`);
      triggerDownload(resp.data, filename);
      setExportOpen(false);
    } catch {
      message.error(t('adminOrders.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportOrder = async (e, orderId) => {
    e.stopPropagation();
    setRowExportingId(orderId);
    try {
      const resp = await api.get(`/orders/admin/${orderId}/export/`, { responseType: 'blob' });
      const filename = filenameFromHeaders(resp.headers, `order_${orderId}.csv`);
      triggerDownload(resp.data, filename);
    } catch {
      message.error(t('adminOrders.exportFailed'));
    } finally {
      setRowExportingId(null);
    }
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
    { title: t('adminOrders.service'), dataIndex: 'selected_category_name', width: 140, ellipsis: true, render: (v) => localized(v) },
    { title: t('orders.date'), dataIndex: 'requested_date', width: 110 },
    { title: t('adminOrders.status'), dataIndex: 'status', width: 130, render: (s) => <StatusBadge status={s} /> },
    { title: t('adminOrders.urgencyLabel'), dataIndex: 'urgency', width: 100, render: (u) => <UrgencyBadge urgency={u} /> },
    {
      title: '', width: 90,
      render: (_, r) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<DownloadOutlined />}
            loading={rowExportingId === r.id}
            onClick={(e) => handleExportOrder(e, r.id)}
            title={t('adminOrders.downloadOrder')}
            style={{ color: 'var(--text-secondary)' }}
          />
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/orders/${r.id}`)}
            style={{ color: 'var(--accent)' }}
          />
        </Space>
      ),
    },
  ];

  const hasMore = pagination.current * pagination.pageSize < pagination.total;

  return (
    <div className="page-enter">
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 0 24px 0', flexWrap: 'wrap',
      }}>
        <Title level={3} style={{
          margin: 0, fontWeight: 800,
          letterSpacing: '-0.02em', color: 'var(--text-primary)',
        }}>
          {historyMode ? t('adminOrders.orderHistory') : t('adminOrders.activeOrders')}
        </Title>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => setExportOpen(true)}
          style={{ borderRadius: 10, fontWeight: 600 }}
        >
          {t('adminOrders.exportOrders')}
        </Button>
      </div>

      <Modal
        title={t('adminOrders.exportOrdersTitle')}
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={handleExportOrders}
        okText={t('adminOrders.downloadCsv')}
        cancelText={t('common.cancel')}
        confirmLoading={exporting}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text style={{ color: 'var(--text-secondary)' }}>
            {t('adminOrders.exportDateHint')}
          </Text>
          <DatePicker.RangePicker
            value={exportRange}
            onChange={(range) => setExportRange(range)}
            style={{ width: '100%' }}
            allowClear
          />
        </div>
      </Modal>

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
            placeholder={t('adminOrders.searchUsers')}
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            allowClear
            style={{
              width: isMobile ? '100%' : 220,
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
            placeholder={t('adminOrders.service')}
            allowClear
            style={{ width: isMobile ? 140 : 170 }}
            value={searchParams.get('service') || undefined}
            onChange={(val) => updateFilter('service', val)}
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={categories.map((c) => ({ value: String(c.id), label: localized(c.name) }))}
          />
          <Select
            placeholder={t('adminOrders.vehicle')}
            allowClear
            style={{ width: isMobile ? 160 : 200 }}
            value={searchParams.get('vehicle') || undefined}
            onChange={(val) => updateFilter('vehicle', val)}
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={vehicles.map((v) => ({
              value: String(v.id),
              label: `${v.name} (${v.plate_number})`,
            }))}
          />
          <DatePicker.RangePicker
            value={[
              searchParams.get('requested_date_from') ? dayjs(searchParams.get('requested_date_from')) : null,
              searchParams.get('requested_date_to') ? dayjs(searchParams.get('requested_date_to')) : null,
            ]}
            onChange={(range) => {
              const params = Object.fromEntries(searchParams.entries());
              if (range && range[0] && range[1]) {
                params.requested_date_from = range[0].format('YYYY-MM-DD');
                params.requested_date_to = range[1].format('YYYY-MM-DD');
              } else {
                delete params.requested_date_from;
                delete params.requested_date_to;
              }
              setSearchParams(params);
            }}
            placeholder={[t('orders.date'), t('orders.date')]}
            style={{ borderRadius: 10 }}
          />
          <TimePicker
            format="HH:mm"
            value={searchParams.get('requested_time')
              ? dayjs(searchParams.get('requested_time'), 'HH:mm')
              : null}
            onChange={(val) => {
              updateFilter('requested_time', val ? val.format('HH:mm') : null);
            }}
            placeholder={t('orders.time')}
            style={{ borderRadius: 10, width: isMobile ? 120 : 140 }}
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
                    <Space size={0}>
                      <Button
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        loading={rowExportingId === order.id}
                        onClick={(e) => handleExportOrder(e, order.id)}
                        title={t('adminOrders.downloadOrder')}
                        style={{ color: 'var(--text-tertiary)' }}
                      />
                      <RightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 11 }} />
                    </Space>
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
