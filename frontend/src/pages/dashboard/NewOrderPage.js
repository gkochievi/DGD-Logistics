import React, { useEffect, useState } from 'react';
import {
  Form, Input, Button, Select, DatePicker, TimePicker, Upload,
  Typography, message, Alert, Grid,
} from 'antd';
import {
  UploadOutlined, BulbOutlined, CameraOutlined,
  EnvironmentOutlined, CalendarOutlined, UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api/client';
import { URGENCY_OPTIONS } from '../../utils/status';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

export default function NewOrderPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [categories, setCategories] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    api.get('/categories/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    }).catch(() => message.error('Failed to load categories'));
  }, []);

  const handleDescriptionBlur = async () => {
    const desc = form.getFieldValue('description');
    if (desc && desc.length > 10) {
      try {
        const { data } = await api.post('/categories/suggest/', { description: desc });
        if (data.id) {
          setSuggestion(data);
        }
      } catch { /* ignore */ }
    }
  };

  const applySuggestion = () => {
    if (suggestion) {
      form.setFieldsValue({ selected_category: suggestion.id });
      setSuggestion(null);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('selected_category', values.selected_category);
      formData.append('pickup_location', values.pickup_location);
      formData.append('destination_location', values.destination_location || '');
      formData.append('requested_date', values.requested_date.format('YYYY-MM-DD'));
      if (values.requested_time) {
        formData.append('requested_time', values.requested_time.format('HH:mm'));
      }
      formData.append('contact_name', values.contact_name);
      formData.append('contact_phone', values.contact_phone);
      formData.append('description', values.description);
      formData.append('cargo_details', values.cargo_details || '');
      formData.append('urgency', values.urgency || 'normal');
      formData.append('user_note', values.user_note || '');

      if (suggestion?.id) {
        formData.append('suggested_category', suggestion.id);
      }

      fileList.forEach((file) => {
        formData.append('images', file.originFileObj);
      });

      const { data } = await api.post('/orders/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Order created successfully!');
      navigate(`/dashboard/orders/${data.id}`);
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const firstErr = Object.values(detail).flat()[0];
        message.error(typeof firstErr === 'string' ? firstErr : 'Failed to create order.');
      } else {
        message.error('Failed to create order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isMobile = !screens.md;

  const sectionLabelStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 20, paddingBottom: 12,
    borderBottom: '1px solid var(--border-color)',
  };

  const sectionLabelTextStyle = {
    fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: isMobile ? 80 : 0 }} className="page-enter">
      <Title level={3} style={{
        marginBottom: 24, fontWeight: 800, letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
      }}>
        Create New Order
      </Title>

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        padding: isMobile ? 20 : 28,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ urgency: 'normal' }}
          requiredMark={false}
        >
          {/* Transport Details Section */}
          <div style={sectionLabelStyle}>
            <FileTextOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
            <span style={sectionLabelTextStyle}>Transport Details</span>
          </div>

          <Form.Item
            name="selected_category"
            label={<span style={{ fontWeight: 600 }}>Transport Category</span>}
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              placeholder="Select transport type"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 600 }}>Job Description</span>}
            rules={[{ required: true, message: 'Please describe the job' }]}
          >
            <TextArea
              rows={3}
              placeholder="Describe what needs to be done..."
              onBlur={handleDescriptionBlur}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          {suggestion && (
            <Alert
              type="info"
              showIcon
              icon={<BulbOutlined />}
              message={`Suggested: ${suggestion.name}`}
              action={
                <Button
                  size="small"
                  onClick={applySuggestion}
                  style={{
                    borderRadius: 8, fontWeight: 600,
                    color: 'var(--accent)', borderColor: 'var(--accent)',
                  }}
                >
                  Apply
                </Button>
              }
              closable
              onClose={() => setSuggestion(null)}
              style={{ marginBottom: 16, borderRadius: 10 }}
            />
          )}

          <Form.Item
            name="cargo_details"
            label={<span style={{ fontWeight: 600 }}>Cargo / Task Details</span>}
          >
            <TextArea
              rows={2}
              placeholder="Weight, dimensions, special requirements..."
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="urgency"
            label={<span style={{ fontWeight: 600 }}>Urgency</span>}
          >
            <Select options={URGENCY_OPTIONS} size={isMobile ? 'large' : 'middle'} />
          </Form.Item>

          {/* Location & Schedule Section */}
          <div style={{ ...sectionLabelStyle, marginTop: 8 }}>
            <EnvironmentOutlined style={{ color: '#10b981', fontSize: 15 }} />
            <span style={sectionLabelTextStyle}>Location & Schedule</span>
          </div>

          <Form.Item
            name="pickup_location"
            label={<span style={{ fontWeight: 600 }}>Pickup Location</span>}
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input
              placeholder="Address or location description"
              size={isMobile ? 'large' : 'middle'}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="destination_location"
            label={<span style={{ fontWeight: 600 }}>Destination (optional)</span>}
          >
            <Input
              placeholder="Where should the cargo/vehicle go?"
              size={isMobile ? 'large' : 'middle'}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Form.Item
              name="requested_date"
              label={<span style={{ fontWeight: 600 }}>Requested Date</span>}
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
            >
              <DatePicker
                style={{ width: '100%', borderRadius: 10 }}
                size={isMobile ? 'large' : 'middle'}
                disabledDate={(d) => d && d < dayjs().startOf('day')}
                inputReadOnly
              />
            </Form.Item>
            <Form.Item
              name="requested_time"
              label={<span style={{ fontWeight: 600 }}>Preferred Time</span>}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
            >
              <TimePicker
                format="HH:mm"
                style={{ width: '100%', borderRadius: 10 }}
                size={isMobile ? 'large' : 'middle'}
                inputReadOnly
              />
            </Form.Item>
          </div>

          {/* Contact Section */}
          <div style={{ ...sectionLabelStyle, marginTop: 8 }}>
            <UserOutlined style={{ color: '#009E4A', fontSize: 15 }} />
            <span style={sectionLabelTextStyle}>Contact Information</span>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Form.Item
              name="contact_name"
              label={<span style={{ fontWeight: 600 }}>Contact Person</span>}
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
            >
              <Input
                placeholder="Full name"
                size={isMobile ? 'large' : 'middle'}
                autoComplete="name"
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
            <Form.Item
              name="contact_phone"
              label={<span style={{ fontWeight: 600 }}>Contact Phone</span>}
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
            >
              <Input
                placeholder="Phone number"
                size={isMobile ? 'large' : 'middle'}
                inputMode="tel"
                autoComplete="tel"
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
          </div>

          {/* Additional Section */}
          <div style={{ ...sectionLabelStyle, marginTop: 8 }}>
            <FileTextOutlined style={{ color: '#f59e0b', fontSize: 15 }} />
            <span style={sectionLabelTextStyle}>Additional</span>
          </div>

          <Form.Item
            name="user_note"
            label={<span style={{ fontWeight: 600 }}>Additional Notes</span>}
          >
            <TextArea
              rows={2}
              placeholder="Anything else we should know..."
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 600 }}>Upload Images (optional)</span>}>
            <Upload
              listType="picture"
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
              beforeUpload={() => false}
              multiple
              accept="image/*"
              capture={false}
            >
              <Button
                icon={isMobile ? <CameraOutlined /> : <UploadOutlined />}
                style={{ borderRadius: 10, fontWeight: 600, border: '1px solid var(--border-color)' }}
              >
                {isMobile ? 'Add Photos' : 'Select Images'}
              </Button>
            </Upload>
          </Form.Item>

          {/* Submit */}
          {isMobile ? (
            <div style={{
              position: 'fixed',
              bottom: 56,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'var(--bg-primary)',
              borderTop: '1px solid var(--border-color)',
              zIndex: 99,
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                style={{
                  height: 48, borderRadius: 12, fontWeight: 700,
                  fontSize: 15, background: 'var(--accent)',
                  borderColor: 'var(--accent)',
                }}
              >
                Submit Order
              </Button>
            </div>
          ) : (
            <Form.Item style={{ marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                style={{
                  height: 48, borderRadius: 12, fontWeight: 700,
                  fontSize: 15, background: 'var(--accent)',
                  borderColor: 'var(--accent)',
                }}
              >
                Submit Order
              </Button>
            </Form.Item>
          )}
        </Form>
      </div>
    </div>
  );
}
