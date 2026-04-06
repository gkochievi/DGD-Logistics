import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Radio } from 'antd';
import {
  UserOutlined, MailOutlined, LockOutlined, PhoneOutlined, CarOutlined,
  BankOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';

const { Text } = Typography;

export default function AppRegisterPage() {
  const { register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('personal');

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await register(values);
      message.success(t('auth.welcome'));
      navigate('/app');
    } catch (err) {
      const errors = err.response?.data;
      if (errors && typeof errors === 'object') {
        const firstErr = Object.values(errors).flat()[0];
        message.error(firstErr || t('auth.registrationFailed'));
      } else {
        message.error(t('auth.registrationFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    height: 52, borderRadius: 16, fontSize: 15,
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
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
        paddingTop: 'calc(48px + env(safe-area-inset-top, 0px))',
        paddingBottom: 28,
        textAlign: 'center',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: 'var(--header-gradient)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
          boxShadow: '0 6px 20px rgba(99,102,241,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -8, right: -8, width: 30, height: 30,
            borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
          }} />
          <CarOutlined style={{ fontSize: 26, color: '#fff', position: 'relative', zIndex: 1 }} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
          {t('auth.createAccount')}
        </div>
        <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {t('auth.getStarted')}
        </Text>
      </div>

      {/* Form */}
      <div style={{ padding: '0 28px', flex: 1 }}>
        <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Form.Item name="first_name" rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1 }}>
              <Input
                prefix={<UserOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('auth.firstName')}
                autoComplete="given-name"
                style={inputStyle}
              />
            </Form.Item>
            <Form.Item name="last_name" rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1 }}>
              <Input
                prefix={<UserOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('auth.lastName')}
                autoComplete="family-name"
                style={inputStyle}
              />
            </Form.Item>
          </div>

          <Form.Item name="email" rules={[
            { required: true, message: t('auth.enterEmail') },
            { type: 'email', message: t('auth.invalidEmail') },
          ]}>
            <Input
              prefix={<MailOutlined style={{ color: 'var(--text-placeholder)' }} />}
              placeholder={t('auth.email')}
              inputMode="email"
              autoComplete="email"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item name="phone_number" rules={[{ required: true, message: t('newOrder.enterPhone') }]}>
            <Input
              prefix={<PhoneOutlined style={{ color: 'var(--text-placeholder)' }} />}
              placeholder={t('auth.phone')}
              inputMode="tel"
              autoComplete="tel"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item name="user_type" initialValue="personal">
            <Radio.Group
              onChange={(e) => setUserType(e.target.value)}
              style={{ display: 'flex', gap: 10, width: '100%' }}
            >
              {['personal', 'company'].map((type) => (
                <Radio.Button
                  key={type}
                  value={type}
                  style={{
                    flex: 1, textAlign: 'center', height: 52, lineHeight: '52px',
                    borderRadius: 16, fontSize: 15, fontWeight: 600,
                  }}
                >
                  {type === 'personal' ? <TeamOutlined style={{ marginRight: 6 }} /> : <BankOutlined style={{ marginRight: 6 }} />}
                  {t(`auth.${type}`)}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          {userType === 'company' && (
            <div className="animate-fade-in-up">
              <Form.Item name="company_name" rules={[{ required: true, message: t('common.required') }]}>
                <Input
                  prefix={<BankOutlined style={{ color: 'var(--text-placeholder)' }} />}
                  placeholder={t('auth.companyName')}
                  style={inputStyle}
                />
              </Form.Item>
              <Form.Item
                name="company_id"
                rules={[
                  { required: true, message: t('common.required') },
                  { pattern: /^\d{11}$/, message: t('auth.companyIdInvalid') },
                ]}
                extra={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('auth.companyIdHelp')}</span>}
              >
                <Input
                  prefix={<BankOutlined style={{ color: 'var(--text-placeholder)' }} />}
                  placeholder={t('auth.companyIdPlaceholder')}
                  maxLength={11}
                  inputMode="numeric"
                  style={inputStyle}
                />
              </Form.Item>
            </div>
          )}

          <Form.Item name="password" rules={[
            { required: true, message: t('auth.createPassword') },
            { min: 8, message: t('auth.minPassword') },
          ]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-placeholder)' }} />}
              placeholder={t('auth.password')}
              autoComplete="new-password"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item name="confirm_password" dependencies={['password']} rules={[
            { required: true, message: t('auth.confirmPassword') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error(t('auth.passwordMismatch')));
              },
            }),
          ]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-placeholder)' }} />}
              placeholder={t('auth.confirmPassword')}
              autoComplete="new-password"
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 4 }}>
            <Button
              type="primary" htmlType="submit" block loading={loading}
              style={{
                height: 54, borderRadius: 16, fontSize: 16, fontWeight: 700,
                background: 'var(--header-gradient)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {t('auth.createAccount')}
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 28px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        textAlign: 'center',
      }}>
        <Text style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('auth.hasAccount')} </Text>
        <span
          onClick={() => navigate('/app/login')}
          style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {t('auth.login')}
        </span>
      </div>
    </div>
  );
}
