import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { MailOutlined, LockOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';

const { Text } = Typography;

export default function AppLoginPage() {
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.email, values.password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || t('auth.invalidCredentials');
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Logo area */}
      <div style={{
        paddingTop: 'calc(72px + env(safe-area-inset-top, 0px))',
        paddingBottom: 48,
        textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'var(--header-gradient)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative shine */}
          <div style={{
            position: 'absolute', top: -10, right: -10, width: 40, height: 40,
            borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
          }} />
          <CarOutlined style={{ fontSize: 36, color: '#fff', position: 'relative', zIndex: 1 }} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
          {t('common.appName')}
        </div>
        <Text style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
          {t('auth.tagline')}
        </Text>
      </div>

      {/* Form */}
      <div style={{ padding: '0 28px', flex: 1 }}>
        <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
          <Form.Item name="email" rules={[{ required: true, message: t('auth.enterEmail') }]}>
            <Input
              prefix={<MailOutlined style={{ color: 'var(--text-placeholder)' }} />}
              placeholder={t('auth.email')}
              inputMode="email"
              autoComplete="email"
              style={{
                height: 54, borderRadius: 16, fontSize: 16,
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
              }}
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: t('auth.enterPassword') }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-placeholder)' }} />}
              placeholder={t('auth.password')}
              autoComplete="current-password"
              style={{
                height: 54, borderRadius: 16, fontSize: 16,
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
              }}
            />
          </Form.Item>
          <Form.Item style={{ marginTop: 12 }}>
            <Button
              type="primary" htmlType="submit" block loading={loading}
              style={{
                height: 54, borderRadius: 16, fontSize: 16, fontWeight: 700,
                background: 'var(--header-gradient)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {t('auth.login')}
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* Footer */}
      <div style={{
        padding: '28px',
        paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
        textAlign: 'center',
      }}>
        <Text style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('auth.noAccount')} </Text>
        <span
          onClick={() => navigate('/app/register')}
          style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {t('auth.signUp')}
        </span>
      </div>
    </div>
  );
}
