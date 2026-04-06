import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Radio } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;

export default function RegisterPage() {
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

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: 'calc(100vh - 130px)', padding: 16, background: 'var(--bg-secondary)',
    }}>
      <Card style={{ width: '100%', maxWidth: 480 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>{t('auth.createAccount')}</Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          {t('auth.getStarted')}
        </Text>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="first_name" rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1 }}>
              <Input prefix={<UserOutlined />} placeholder={t('auth.firstName')} />
            </Form.Item>
            <Form.Item name="last_name" rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1 }}>
              <Input prefix={<UserOutlined />} placeholder={t('auth.lastName')} />
            </Form.Item>
          </div>
          <Form.Item name="email" rules={[
            { required: true, message: t('auth.enterEmail') },
            { type: 'email', message: t('auth.invalidEmail') },
          ]}>
            <Input prefix={<MailOutlined />} placeholder={t('auth.email')} inputMode="email" autoComplete="email" />
          </Form.Item>
          <Form.Item name="phone_number" rules={[{ required: true, message: t('newOrder.enterPhone') }]}>
            <Input prefix={<PhoneOutlined />} placeholder={t('auth.phone')} inputMode="tel" autoComplete="tel" />
          </Form.Item>

          <Form.Item name="user_type" label={t('auth.userType')} initialValue="personal">
            <Radio.Group onChange={(e) => setUserType(e.target.value)} style={{ width: '100%' }}>
              <Radio.Button value="personal" style={{ width: '50%', textAlign: 'center' }}>
                <TeamOutlined style={{ marginRight: 6 }} />{t('auth.personal')}
              </Radio.Button>
              <Radio.Button value="company" style={{ width: '50%', textAlign: 'center' }}>
                <BankOutlined style={{ marginRight: 6 }} />{t('auth.company')}
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {userType === 'company' && (
            <>
              <Form.Item name="company_name" rules={[{ required: true, message: t('common.required') }]}>
                <Input prefix={<BankOutlined />} placeholder={t('auth.companyName')} />
              </Form.Item>
              <Form.Item
                name="company_id"
                rules={[
                  { required: true, message: t('common.required') },
                  { pattern: /^\d{11}$/, message: t('auth.companyIdInvalid') },
                ]}
                extra={<span style={{ fontSize: 12 }}>{t('auth.companyIdHelp')}</span>}
              >
                <Input prefix={<BankOutlined />} placeholder={t('auth.companyIdPlaceholder')} maxLength={11} inputMode="numeric" />
              </Form.Item>
            </>
          )}

          <Form.Item name="password" rules={[
            { required: true, message: t('auth.createPassword') },
            { min: 8, message: t('auth.minPassword') },
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} autoComplete="new-password" />
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
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.confirmPassword')} autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48 }}>{t('auth.createAccount')}</Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary">{t('auth.hasAccount')}</Text>
        </Divider>
        <Link to="/login">
          <Button block>{t('auth.login')}</Button>
        </Link>
      </Card>
    </div>
  );
}
