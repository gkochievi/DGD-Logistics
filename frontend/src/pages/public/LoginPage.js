import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.email, values.password);
      message.success(t('auth.welcome'));
      navigate(user.role === 'admin' ? '/admin' : '/app');
    } catch (err) {
      const detail = err.response?.data?.detail || t('auth.invalidCredentials');
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: 'calc(100vh - 130px)', padding: 16, background: 'var(--bg-secondary)',
    }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>{t('auth.welcomeBack')}</Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          {t('auth.loginSubtitle')}
        </Text>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="email" rules={[{ required: true, message: t('auth.enterEmail') }]}>
            <Input prefix={<MailOutlined />} placeholder={t('auth.email')} type="email" inputMode="email" autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: t('auth.enterPassword') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 48 }}>{t('auth.login')}</Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary">{t('auth.noAccount')}</Text>
        </Divider>
        <Link to="/register">
          <Button block>{t('auth.createAccount')}</Button>
        </Link>
      </Card>
    </div>
  );
}
