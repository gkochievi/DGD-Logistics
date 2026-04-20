import React, { useEffect, useState } from 'react';
import {
  Descriptions, Typography, Spin, Button, Timeline, Image, Space,
  Modal, message, Empty, Grid,
} from 'antd';
import {
  ArrowLeftOutlined, CloseCircleOutlined, PictureOutlined, HistoryOutlined,
} from '@ant-design/icons';
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );
  if (!order) return <Empty description="Order not found" />;

  const isMobile = !screens.md;

  const sectionStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  };

  const sectionHeaderStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };

  const sectionTitleStyle = {
    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
    letterSpacing: '-0.02em', margin: 0,
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }} className="page-enter">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard/orders')}
            size={isMobile ? 'large' : 'middle'}
            style={{ borderRadius: 10, border: '1px solid var(--border-color)' }}
          >
            {isMobile ? '' : 'Back'}
          </Button>
          <Title level={3} style={{
            margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            Order #{order.id}
          </Title>
          <StatusBadge status={order.status} />
        </div>
        {order.is_cancellable && (
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={handleCancel}
            size={isMobile ? 'large' : 'middle'}
            style={{
              borderRadius: 10, fontWeight: 600,
              ...(isMobile ? { height: 44 } : {}),
            }}
          >
            Cancel Order
          </Button>
        )}
      </div>

      {/* Order details */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Text style={sectionTitleStyle}>Order Details</Text>
        </div>
        <div style={{ padding: isMobile ? 16 : 24 }}>
          <Descriptions
            column={isMobile ? 1 : 2}
            size="small"
            labelStyle={{ color: 'var(--text-tertiary)', fontWeight: 500 }}
          >
            <Descriptions.Item label="Status"><StatusBadge status={order.status} /></Descriptions.Item>
            <Descriptions.Item label="Urgency"><UrgencyBadge urgency={order.urgency} /></Descriptions.Item>
            <Descriptions.Item label="Category">
              {order.selected_category_detail?.name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Final Category">
              {order.final_category_detail?.name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Pickup" span={isMobile ? 1 : 2}>
              {order.pickup_location}
            </Descriptions.Item>
            <Descriptions.Item label="Destination" span={isMobile ? 1 : 2}>
              {order.destination_location || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Requested Date">{order.requested_date}</Descriptions.Item>
            <Descriptions.Item label="Time">{order.requested_time || '—'}</Descriptions.Item>
            <Descriptions.Item label="Contact">{order.contact_name}</Descriptions.Item>
            <Descriptions.Item label="Phone">{order.contact_phone}</Descriptions.Item>
            <Descriptions.Item label="Description" span={isMobile ? 1 : 2}>
              {order.description}
            </Descriptions.Item>
            {order.cargo_details && (
              <Descriptions.Item label="Cargo Details" span={isMobile ? 1 : 2}>
                {order.cargo_details}
              </Descriptions.Item>
            )}
            {order.user_note && (
              <Descriptions.Item label="Your Notes" span={isMobile ? 1 : 2}>
                {order.user_note}
              </Descriptions.Item>
            )}
            {order.admin_comment && (
              <Descriptions.Item label="Admin Comment" span={isMobile ? 1 : 2}>
                <div style={{
                  padding: '8px 12px', background: 'var(--accent-bg)',
                  borderRadius: 8, border: '1px solid var(--accent-bg-strong)',
                  color: 'var(--text-secondary)',
                }}>
                  {order.admin_comment}
                </div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Created">
              {new Date(order.created_at).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>

      {/* Images */}
      {order.images?.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <PictureOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>Uploaded Images</Text>
          </div>
          <div style={{ padding: isMobile ? 16 : 24 }}>
            <Image.PreviewGroup>
              <Space wrap size={12}>
                {order.images.map((img) => (
                  <Image
                    key={img.id}
                    width={100}
                    height={100}
                    src={img.image}
                    style={{ objectFit: 'cover', borderRadius: 12 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          </div>
        </div>
      )}

      {/* Status history */}
      {order.status_history?.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <HistoryOutlined style={{ color: '#06b6d4', fontSize: 15 }} />
            <Text style={sectionTitleStyle}>Status History</Text>
          </div>
          <div style={{ padding: isMobile ? 16 : 24 }}>
            <Timeline
              items={order.status_history.map((h) => ({
                color: STATUS_CONFIG[h.new_status]?.color || 'gray',
                children: (
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      <StatusBadge status={h.new_status} />
                      {h.old_status && (
                        <Text style={{
                          color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 6,
                        }}>
                          from {STATUS_CONFIG[h.old_status]?.label}
                        </Text>
                      )}
                    </div>
                    {h.comment && (
                      <div style={{
                        padding: '6px 10px', background: 'var(--bg-secondary)',
                        borderRadius: 8, marginTop: 4, fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}>
                        {h.comment}
                      </div>
                    )}
                    <Text style={{
                      color: 'var(--text-tertiary)', fontSize: 11, marginTop: 4, display: 'block',
                    }}>
                      {new Date(h.created_at).toLocaleString()}
                    </Text>
                  </div>
                ),
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
