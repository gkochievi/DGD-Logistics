import React, { useEffect, useState } from 'react';
import {
  Card, Descriptions, Typography, Tag, Spin, Button, Timeline, Image, Space,
  Modal, message, Empty, Grid, Divider,
} from 'antd';
import { ArrowLeftOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import { STATUS_CONFIG } from '../../utils/status';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = () => {
    setLoading(true);
    api.get(`/orders/${id}/`).then(({ data }) => setOrder(data))
      .catch(() => message.error('Order not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrder(); }, [id]); // eslint-disable-line

  const handleCancel = () => {
    Modal.confirm({
      title: 'Cancel this order?',
      content: 'This action cannot be undone.',
      okText: 'Yes, cancel',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.post(`/orders/${id}/cancel/`);
          message.success('Order cancelled');
          fetchOrder();
        } catch (err) {
          message.error(err.response?.data?.detail || 'Failed to cancel order');
        }
      },
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!order) return <Empty description="Order not found" />;

  const isMobile = !screens.md;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/orders')}
            size={isMobile ? 'large' : 'middle'}>
            {isMobile ? '' : 'Back'}
          </Button>
          <Title level={4} style={{ margin: 0 }}>Order #{order.id}</Title>
        </Space>
        {order.is_cancellable && (
          <Button danger icon={<CloseCircleOutlined />} onClick={handleCancel}
            size={isMobile ? 'large' : 'middle'} style={isMobile ? { height: 44 } : {}}>
            Cancel Order
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={isMobile ? 1 : 2} bordered size="small">
          <Descriptions.Item label="Status"><StatusBadge status={order.status} /></Descriptions.Item>
          <Descriptions.Item label="Urgency"><UrgencyBadge urgency={order.urgency} /></Descriptions.Item>
          <Descriptions.Item label="Category">{order.selected_category_detail?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Final Category">{order.final_category_detail?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Pickup" span={isMobile ? 1 : 2}>{order.pickup_location}</Descriptions.Item>
          <Descriptions.Item label="Destination" span={isMobile ? 1 : 2}>{order.destination_location || '—'}</Descriptions.Item>
          <Descriptions.Item label="Requested Date">{order.requested_date}</Descriptions.Item>
          <Descriptions.Item label="Time">{order.requested_time || '—'}</Descriptions.Item>
          <Descriptions.Item label="Contact">{order.contact_name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{order.contact_phone}</Descriptions.Item>
          <Descriptions.Item label="Description" span={isMobile ? 1 : 2}>{order.description}</Descriptions.Item>
          {order.cargo_details && (
            <Descriptions.Item label="Cargo Details" span={isMobile ? 1 : 2}>{order.cargo_details}</Descriptions.Item>
          )}
          {order.user_note && (
            <Descriptions.Item label="Your Notes" span={isMobile ? 1 : 2}>{order.user_note}</Descriptions.Item>
          )}
          {order.admin_comment && (
            <Descriptions.Item label="Admin Comment" span={isMobile ? 1 : 2}>
              <Text type="warning">{order.admin_comment}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Created">{new Date(order.created_at).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>

      {order.images?.length > 0 && (
        <Card title="Uploaded Images" style={{ marginBottom: 16 }}>
          <Image.PreviewGroup>
            <Space wrap>
              {order.images.map((img) => (
                <Image key={img.id} width={100} height={100} src={img.image}
                  style={{ objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}

      {order.status_history?.length > 0 && (
        <Card title="Status History">
          <Timeline
            items={order.status_history.map((h) => ({
              color: STATUS_CONFIG[h.new_status]?.color || 'gray',
              children: (
                <div>
                  <div>
                    <StatusBadge status={h.new_status} />
                    {h.old_status && <Text type="secondary"> from {STATUS_CONFIG[h.old_status]?.label}</Text>}
                  </div>
                  {h.comment && <Text type="secondary" style={{ fontSize: 12 }}>{h.comment}</Text>}
                  <div><Text type="secondary" style={{ fontSize: 11 }}>{new Date(h.created_at).toLocaleString()}</Text></div>
                </div>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
}
