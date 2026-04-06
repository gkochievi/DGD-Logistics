import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Typography, message, Divider, Row, Col,
  Statistic, Spin, Grid,
} from 'antd';
import {
  UserOutlined, PhoneOutlined, MailOutlined,
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const screens = useBreakpoint();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [stats, setStats] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
      });
    }
    api.get('/auth/profile/stats/').then(({ data }) => setStats(data)).catch(() => {});
  }, [user]); // eslint-disable-line

  const handleProfileUpdate = async (values) => {
    setProfileLoading(true);
    try {
      await api.patch('/auth/profile/', values);
      await refreshProfile();
      message.success('Profile updated!');
    } catch {
      message.error('Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values) => {
    setPasswordLoading(true);
    try {
      await api.post('/auth/profile/change-password/', values);
      passwordForm.resetFields();
      message.success('Password changed!');
    } catch (err) {
      const detail = err.response?.data;
      const firstErr = detail ? Object.values(detail).flat()[0] : 'Failed to change password.';
      message.error(typeof firstErr === 'string' ? firstErr : 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const isMobile = !screens.md;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={4}>My Profile</Title>

      {/* Account summary */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16 }}>{user?.first_name} {user?.last_name}</Text>
          <br />
          <Text type="secondary">{user?.email}</Text>
        </div>
        {stats && (
          <Row gutter={[16, 16]}>
            <Col xs={8}>
              <Statistic title="Total" value={stats.total_orders} prefix={<FileTextOutlined />} />
            </Col>
            <Col xs={8}>
              <Statistic title="Active" value={stats.active_orders} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#fa8c16' }} />
            </Col>
            <Col xs={8}>
              <Statistic title="Done" value={stats.completed_orders} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
            </Col>
          </Row>
        )}
      </Card>

      {/* Edit profile */}
      <Card title="Edit Profile" style={{ marginBottom: 16 }}>
        <Form form={profileForm} layout="vertical" onFinish={handleProfileUpdate}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]} style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]} style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </div>
          <Form.Item name="phone_number" label="Phone Number">
            <Input prefix={<PhoneOutlined />} inputMode="tel" autoComplete="tel" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={profileLoading}>Save Changes</Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Change password */}
      <Card title="Change Password">
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
          <Form.Item name="old_password" label="Current Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="new_password" label="New Password" rules={[
            { required: true },
            { min: 8, message: 'Minimum 8 characters' },
          ]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>Change Password</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
