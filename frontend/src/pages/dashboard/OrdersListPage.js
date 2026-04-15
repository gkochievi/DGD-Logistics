import React, { useEffect, useState } from 'react';
import { Table, Select, Button, Typography, Empty, Grid, Space } from 'antd';
import { PlusCircleOutlined, EyeOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_OPTIONS } from '../../utils/status';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function OrdersListPage() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const statusFilter = searchParams.get('status') || '';

  const fetchOrders = (page = 1, status = statusFilter) => {
    setLoading(true);
    const params = { page };
    if (status) params.status = status;
    api.get('/orders/', { params }).then(({ data }) => {
      const results = data.results || data;
      setOrders(Array.isArray(results) ? results : []);
      setPagination((p) => ({ ...p, current: page, total: data.count || results.length }));
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]); // eslint-disable-line

  const handleStatusChange = (val) => {
    if (val) {
      setSearchParams({ status: val });
    } else {
      setSearchParams({});
    }
  };

  const isMobile = !screens.md;

  const columns = [
    {
      title: 'ID', dataIndex: 'id', width: 70,
      render: (id) => (
        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>#{id}</span>
      ),
    },
    {
      title: 'Pickup', dataIndex: 'pickup_location', ellipsis: true,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    { title: 'Category', dataIndex: 'selected_category_name', ellipsis: true },
    { title: 'Date', dataIndex: 'requested_date', width: 110 },
    { title: 'Status', dataIndex: 'status', width: 130, render: (s) => <StatusBadge status={s} /> },
    { title: 'Urgency', dataIndex: 'urgency', width: 100, render: (u) => <UrgencyBadge urgency={u} /> },
    {
      title: '', width: 60,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/dashboard/orders/${record.id}`)}
          style={{ color: 'var(--accent)' }}
        />
      ),
    },
  ];

  const hasMore = pagination.current * pagination.pageSize < pagination.total;

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
          My Orders
        </Title>
        <Space wrap>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: isMobile ? 150 : 170 }}
            value={statusFilter || undefined}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            size={isMobile ? 'large' : 'middle'}
          />
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            size={isMobile ? 'large' : 'middle'}
            onClick={() => navigate('/dashboard/orders/new')}
            style={{
              background: 'var(--accent)', borderColor: 'var(--accent)',
              borderRadius: 10, fontWeight: 600,
            }}
          >
            New Order
          </Button>
        </Space>
      </div>

      {/* Content */}
      {isMobile ? (
        <>
          {loading && orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
              Loading...
            </div>
          ) : orders.length === 0 ? (
            <Empty description="No orders found" />
          ) : (
            <>
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 8,
                  }}>
                    <Text style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
                      #{order.id}
                    </Text>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 500,
                    color: 'var(--text-primary)', marginBottom: 6,
                  }}>
                    {order.pickup_location}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {order.requested_date} · {order.selected_category_name || '—'}
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
                  Load More
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
              onChange: (page) => fetchOrders(page),
              showSizeChanger: false,
              style: { padding: '0 16px' },
            }}
            onRow={(record) => ({
              onClick: () => navigate(`/dashboard/orders/${record.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      )}
    </div>
  );
}
