import React, { useEffect, useState } from 'react';
import {
  Form, Input, Button, Typography, message, Grid,
} from 'antd';
import {
  UserOutlined, PhoneOutlined,
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
  LockOutlined, EditOutlined, SafetyOutlined,
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

  const statCards = [
    { title: 'Total', value: stats?.total_orders, icon: <FileTextOutlined />, color: 'var(--accent)' },
    { title: 'Active', value: stats?.active_orders, icon: <ClockCircleOutlined />, color: '#f59e0b' },
    { title: 'Done', value: stats?.completed_orders, icon: <CheckCircleOutlined />, color: '#10b981' },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="page-enter">
      <Title level={3} style={{
        marginBottom: 24, fontWeight: 800, letterSpacing: '-0.02em',
        color: 'var(--text-primary)',
      }}>
        My Profile
      </Title>

      {/* Account summary */}
      <div style={sectionStyle}>
        <div style={{ padding: 24 }}>
          {/* User info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--accent-bg-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: 'var(--accent)', fontWeight: 800,
              flexShrink: 0,
            }}>
              {user?.first_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <Text style={{
                fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
                display: 'block', letterSpacing: '-0.02em',
              }}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
                {user?.email}
              </Text>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {statCards.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  padding: isMobile ? 12 : 16,
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: 24, fontWeight: 800, color: s.color,
                    lineHeight: 1.2, letterSpacing: '-0.02em',
                  }}>
                    {s.value || 0}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-tertiary)',
                    fontWeight: 500, marginTop: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <span style={{ color: s.color, fontSize: 12 }}>{s.icon}</span>
                    {s.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit profile */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <EditOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
          <Text style={sectionTitleStyle}>Edit Profile</Text>
        </div>
        <div style={{ padding: isMobile ? 20 : 24 }}>
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileUpdate}
            requiredMark={false}
          >
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Form.Item
                name="first_name"
                label={<span style={{ fontWeight: 600 }}>First Name</span>}
                rules={[{ required: true }]}
                style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: 'var(--text-tertiary)' }} />}
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
              <Form.Item
                name="last_name"
                label={<span style={{ fontWeight: 600 }}>Last Name</span>}
                rules={[{ required: true }]}
                style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: 'var(--text-tertiary)' }} />}
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </div>
            <Form.Item
              name="phone_number"
              label={<span style={{ fontWeight: 600 }}>Phone Number</span>}
            >
              <Input
                prefix={<PhoneOutlined style={{ color: 'var(--text-tertiary)' }} />}
                inputMode="tel"
                autoComplete="tel"
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={profileLoading}
                style={{
                  background: 'var(--accent)', borderColor: 'var(--accent)',
                  borderRadius: 10, fontWeight: 700, height: 42,
                }}
              >
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

      {/* Change password */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <SafetyOutlined style={{ color: '#f59e0b', fontSize: 15 }} />
          <Text style={sectionTitleStyle}>Change Password</Text>
        </div>
        <div style={{ padding: isMobile ? 20 : 24 }}>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordChange}
            requiredMark={false}
          >
            <Form.Item
              name="old_password"
              label={<span style={{ fontWeight: 600 }}>Current Password</span>}
              rules={[{ required: true }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--text-tertiary)' }} />}
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
            <Form.Item
              name="new_password"
              label={<span style={{ fontWeight: 600 }}>New Password</span>}
              rules={[
                { required: true },
                { min: 8, message: 'Minimum 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--text-tertiary)' }} />}
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={passwordLoading}
                style={{
                  background: 'var(--accent)', borderColor: 'var(--accent)',
                  borderRadius: 10, fontWeight: 700, height: 42,
                }}
              >
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
