import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Button, Typography, Empty, Grid, Space } from 'antd';
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
    { title: 'ID', dataIndex: 'id', width: 60, render: (id) => `#${id}` },
    { title: 'Pickup', dataIndex: 'pickup_location', ellipsis: true },
    { title: 'Category', dataIndex: 'selected_category_name', ellipsis: true },
    { title: 'Date', dataIndex: 'requested_date', width: 110 },
    { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
    { title: 'Urgency', dataIndex: 'urgency', width: 90, render: (u) => <UrgencyBadge urgency={u} /> },
    {
      title: '', width: 60,
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/dashboard/orders/${record.id}`)} />
      ),
    },
  ];

  const hasMore = pagination.current * pagination.pageSize < pagination.total;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>My Orders</Title>
        <Space wrap>
          <Select
            placeholder="Filter by status" allowClear
            style={{ width: isMobile ? 140 : 160 }}
            value={statusFilter || undefined} onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            size={isMobile ? 'large' : 'middle'}
          />
          <Button type="primary" icon={<PlusCircleOutlined />}
            size={isMobile ? 'large' : 'middle'}
            onClick={() => navigate('/dashboard/orders/new')}>
            New Order
          </Button>
        </Space>
      </div>

      {isMobile ? (
        <>
          {loading && orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span>Loading...</span></div>
          ) : orders.length === 0 ? (
            <Empty description="No orders found" />
          ) : (
            <>
              {orders.map((order) => (
                <Card
                  key={order.id}
                  size="small"
                  style={{ marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text strong>#{order.id}</Text>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{order.pickup_location}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {order.requested_date} · {order.selected_category_name || '—'}
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
                  Load More
                </Button>
              )}
            </>
          )}
        </>
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <Table
            columns={columns} dataSource={orders} rowKey="id"
            loading={loading} size="middle"
            pagination={{
              ...pagination,
              onChange: (page) => fetchOrders(page),
              showSizeChanger: false,
            }}
          />
        </Card>
      )}
    </div>
  );
}
