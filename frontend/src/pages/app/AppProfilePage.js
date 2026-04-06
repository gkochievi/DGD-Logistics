import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, message, Modal, Switch, Select } from 'antd';
import {
  UserOutlined, PhoneOutlined, LockOutlined,
  LogoutOutlined, RightOutlined, EditOutlined,
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
  MoonFilled, SunFilled, TranslationOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';

const { Text } = Typography;

export default function AppProfilePage() {
  const { user, logout, refreshProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, lang, changeLang, SUPPORTED_LANGS, LANG_LABELS, LANG_FLAGS } = useLang();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/profile/stats/').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const handleProfileSave = async (values) => {
    setSaving(true);
    try {
      await api.patch('/auth/profile/', values);
      await refreshProfile();
      message.success(t('profile.profileUpdated'));
      setEditMode(false);
    } catch {
      message.error(t('profile.failedUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (values) => {
    setSaving(true);
    try {
      await api.post('/auth/profile/change-password/', values);
      passwordForm.resetFields();
      message.success(t('profile.passwordChanged'));
      setPasswordMode(false);
    } catch (err) {
      const detail = err.response?.data;
      const firstErr = detail ? Object.values(detail).flat()[0] : t('profile.failedPassword');
      message.error(typeof firstErr === 'string' ? firstErr : t('profile.failedPassword'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: t('auth.logoutConfirm'),
      okText: t('auth.logout'),
      okType: 'danger',
      onOk: () => {
        logout();
        navigate('/app/login');
      },
    });
  };

  const inputStyle = { height: 48, borderRadius: 12, fontSize: 15 };

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      {/* Header + user info */}
      <div style={{
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        background: 'var(--bg-primary)',
        borderRadius: '0 0 20px 20px',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {t('profile.title')}
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #1677ff, #0050b3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff', fontWeight: 700,
          }}>
            {(user?.first_name?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{user?.email}</div>
            {user?.user_type && (
              <div style={{
                display: 'inline-block', marginTop: 4,
                fontSize: 11, fontWeight: 500,
                padding: '2px 8px', borderRadius: 6,
                background: user.user_type === 'company' ? '#faad1420' : '#1677ff14',
                color: user.user_type === 'company' ? '#d48806' : '#1677ff',
              }}>
                {user.user_type === 'company'
                  ? `🏢 ${user.company_name || t('auth.company')}${user.company_id ? ` · ${user.company_id}` : ''}`
                  : `👤 ${t('auth.personal')}`}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{
            display: 'flex', gap: 0, marginTop: 16,
            background: 'var(--stats-bg)', borderRadius: 14, overflow: 'hidden',
          }}>
            {[
              { label: t('profile.total'), value: stats.total_orders, icon: <FileTextOutlined />, color: '#1677ff' },
              { label: t('orders.activeTab'), value: stats.active_orders, icon: <ClockCircleOutlined />, color: '#fa8c16' },
              { label: t('profile.done'), value: stats.completed_orders, icon: <CheckCircleOutlined />, color: '#52c41a' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '12px 8px',
                borderRight: i < 2 ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value || 0}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu items */}
      <div style={{ padding: '0 16px' }}>
        <SettingsCard>
          <SettingsItem
            icon={<EditOutlined />}
            label={t('profile.editProfile')}
            onClick={() => {
              profileForm.setFieldsValue({
                first_name: user?.first_name,
                last_name: user?.last_name,
                phone_number: user?.phone_number,
              });
              setEditMode(true);
            }}
          />
          <SettingsItem
            icon={<LockOutlined />}
            label={t('profile.changePassword')}
            onClick={() => setPasswordMode(true)}
          />
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '15px 16px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <span style={{ fontSize: 18, color: 'var(--text-secondary)', width: 24, textAlign: 'center' }}>
              {isDark ? <MoonFilled /> : <SunFilled />}
            </span>
            <span style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)', fontWeight: 400 }}>
              {t('profile.darkMode')}
            </span>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<MoonFilled />}
              unCheckedChildren={<SunFilled />}
            />
          </div>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '15px 16px',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <span style={{ fontSize: 18, color: 'var(--text-secondary)', width: 24, textAlign: 'center' }}>
              <TranslationOutlined />
            </span>
            <span style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)', fontWeight: 400 }}>
              {t('profile.language')}
            </span>
            <Select
              value={lang}
              onChange={changeLang}
              style={{ width: 140 }}
              options={SUPPORTED_LANGS.map((l) => ({
                value: l,
                label: `${LANG_FLAGS[l]} ${LANG_LABELS[l]}`,
              }))}
            />
          </div>
        </SettingsCard>

        <SettingsCard>
          <SettingsItem
            icon={<LogoutOutlined style={{ color: '#ff4d4f' }} />}
            label={t('auth.logout')}
            danger
            onClick={handleLogout}
          />
        </SettingsCard>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        open={editMode}
        onCancel={() => setEditMode(false)}
        footer={null}
        title={t('profile.editProfile')}
        destroyOnClose
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={profileForm} layout="vertical" onFinish={handleProfileSave} requiredMark={false}>
          <Form.Item name="first_name" label={t('auth.firstName')} rules={[{ required: true }]}>
            <Input prefix={<UserOutlined style={{ color: 'var(--text-placeholder)' }} />} style={inputStyle} />
          </Form.Item>
          <Form.Item name="last_name" label={t('auth.lastName')} rules={[{ required: true }]}>
            <Input prefix={<UserOutlined style={{ color: 'var(--text-placeholder)' }} />} style={inputStyle} />
          </Form.Item>
          <Form.Item name="phone_number" label={t('auth.phone')}>
            <Input prefix={<PhoneOutlined style={{ color: 'var(--text-placeholder)' }} />} inputMode="tel" style={inputStyle} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}
            style={{ height: 48, borderRadius: 12, fontWeight: 600 }}>
            {t('profile.saveChanges')}
          </Button>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={passwordMode}
        onCancel={() => setPasswordMode(false)}
        footer={null}
        title={t('profile.changePassword')}
        destroyOnClose
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange} requiredMark={false}>
          <Form.Item name="old_password" label={t('profile.currentPassword')} rules={[{ required: true }]}>
            <Input.Password style={inputStyle} />
          </Form.Item>
          <Form.Item name="new_password" label={t('profile.newPassword')} rules={[
            { required: true },
            { min: 8, message: t('auth.minPassword') },
          ]}>
            <Input.Password style={inputStyle} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}
            style={{ height: 48, borderRadius: 12, fontWeight: 600 }}>
            {t('profile.changePassword')}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}


function SettingsCard({ children }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 14, overflow: 'hidden',
      marginBottom: 12, boxShadow: 'var(--shadow-sm)',
    }}>
      {children}
    </div>
  );
}

function SettingsItem({ icon, label, onClick, danger }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '15px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-light)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 18, color: danger ? '#ff4d4f' : 'var(--text-secondary)', width: 24, textAlign: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 15, color: danger ? '#ff4d4f' : 'var(--text-primary)', fontWeight: 400 }}>
        {label}
      </span>
      <RightOutlined style={{ color: 'var(--text-placeholder)', fontSize: 12 }} />
    </div>
  );
}
