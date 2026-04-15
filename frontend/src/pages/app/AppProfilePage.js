import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, message, Modal, Switch, Select, Grid } from 'antd';
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
const { useBreakpoint } = Grid;

export default function AppProfilePage() {
  const { user, logout, refreshProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, lang, changeLang, SUPPORTED_LANGS, LANG_LABELS, LANG_FLAGS } = useLang();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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

  const inputStyle = { height: 50, borderRadius: 14, fontSize: 15 };

  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', maxWidth: isMobile ? '100%' : 800, margin: isMobile ? 0 : '0 auto', padding: isMobile ? 0 : '24px 40px' }}>
      {/* Header with gradient avatar area */}
      <div style={{
        paddingTop: isMobile ? 'calc(24px + env(safe-area-inset-top, 0px))' : 0,
        background: 'var(--bg-primary)',
        borderRadius: isMobile ? '0 0 24px 24px' : 16,
        marginBottom: 12,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        border: isMobile ? 'none' : '1px solid var(--border-color)',
      }}>
        {/* Gradient header strip */}
        <div style={{
          background: 'var(--header-gradient)',
          height: 80,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 120, height: 120,
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute', bottom: -15, left: -15, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
          }} />
        </div>

        {/* Avatar + name overlapping the gradient */}
        <div style={{ padding: '0 20px 20px', marginTop: -36 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20,
              background: 'var(--header-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, color: '#fff', fontWeight: 700,
              border: '4px solid var(--bg-primary)',
              boxShadow: 'var(--shadow-md)',
              flexShrink: 0,
            }}>
              {(user?.first_name?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <div style={{
                fontSize: 19, fontWeight: 700, color: 'var(--text-primary)',
                letterSpacing: -0.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{
                fontSize: 13, color: 'var(--text-tertiary)', marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* User type badge */}
          {user?.user_type && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 12,
              fontSize: 12, fontWeight: 500,
              padding: '4px 12px', borderRadius: 10,
              background: user.user_type === 'company' ? '#f59e0b10' : 'var(--accent-bg)',
              color: user.user_type === 'company' ? 'var(--warning-color)' : 'var(--accent)',
            }}>
              {user.user_type === 'company'
                ? `${user.company_name || t('auth.company')}${user.company_id ? ` \u00B7 ${user.company_id}` : ''}`
                : t('auth.personal')}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div style={{
              display: 'flex', gap: 0, marginTop: 16,
              background: 'var(--stats-bg)', borderRadius: 16, overflow: 'hidden',
              border: '1px solid var(--border-color)',
            }}>
              {[
                { label: t('profile.total'), value: stats.total_orders, icon: <FileTextOutlined />, color: 'var(--accent)' },
                { label: t('orders.activeTab'), value: stats.active_orders, icon: <ClockCircleOutlined />, color: 'var(--warning-color)' },
                { label: t('profile.done'), value: stats.completed_orders, icon: <CheckCircleOutlined />, color: 'var(--success-color)' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '14px 8px',
                  borderRight: i < 2 ? '1px solid var(--border-light)' : 'none',
                  transition: 'background 0.2s ease',
                }}>
                  <div style={{
                    fontSize: 12, color: s.color, marginBottom: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    {s.icon}
                  </div>
                  <div style={{
                    fontSize: 22, fontWeight: 800, color: s.color,
                    letterSpacing: -0.5,
                  }}>
                    {s.value || 0}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2,
                    fontWeight: 500,
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings menu */}
      <div style={{ padding: isMobile ? '0 16px' : 0 }}>
        <SettingsCard>
          <SettingsItem
            icon={<EditOutlined />}
            label={t('profile.editProfile')}
            iconBg="var(--accent-bg)"
            iconColor="var(--accent)"
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
            iconBg="var(--accent-bg)"
            iconColor="var(--accent)"
            onClick={() => setPasswordMode(true)}
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-light)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isDark ? '#009E4A14' : '#f59e0b14',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: isDark ? '#009E4A' : '#f59e0b',
              flexShrink: 0,
            }}>
              {isDark ? <MoonFilled /> : <SunFilled />}
            </div>
            <span style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
              {t('profile.darkMode')}
            </span>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<MoonFilled />}
              unCheckedChildren={<SunFilled />}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#3b82f614',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#3b82f6',
              flexShrink: 0,
            }}>
              <TranslationOutlined />
            </div>
            <span style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
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
            icon={<LogoutOutlined />}
            label={t('auth.logout')}
            danger
            iconBg="var(--danger-bg)"
            iconColor="#ef4444"
            onClick={handleLogout}
            hideBorder
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
            style={{
              height: 50, borderRadius: 14, fontWeight: 600, fontSize: 15,
              background: 'var(--fab-gradient)', border: 'none',
              boxShadow: 'var(--fab-shadow)',
            }}>
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
            style={{
              height: 50, borderRadius: 14, fontWeight: 600, fontSize: 15,
              background: 'var(--fab-gradient)', border: 'none',
              boxShadow: 'var(--fab-shadow)',
            }}>
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
      background: 'var(--card-bg)', borderRadius: 16, overflow: 'hidden',
      marginBottom: 12, boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-color)',
    }}>
      {children}
    </div>
  );
}

function SettingsItem({ icon, label, onClick, danger, iconBg, iconColor, hideBorder }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        borderBottom: hideBorder ? 'none' : '1px solid var(--border-light)',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: iconBg || 'var(--badge-muted-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: iconColor || 'var(--text-secondary)',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{
        flex: 1, fontSize: 15,
        color: danger ? '#ef4444' : 'var(--text-primary)',
        fontWeight: 500,
      }}>
        {label}
      </span>
      <RightOutlined style={{ color: 'var(--text-placeholder)', fontSize: 12 }} />
    </div>
  );
}
