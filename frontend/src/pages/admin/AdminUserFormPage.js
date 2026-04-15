import React, { useEffect, useState } from 'react';
import {
  Form, Input, Button, Select, Switch, Typography, message, Spin,
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, MailOutlined, PhoneOutlined,
  LockOutlined, BankOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;

export default function AdminUserFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t } = useLang();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/auth/admin/users/${id}/`).then(({ data }) => {
        form.setFieldsValue(data);
      }).catch(() => message.error(t('adminUsers.noUsers')))
        .finally(() => setLoading(false));
    }
  }, [id]); // eslint-disable-line

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/auth/admin/users/${id}/`, values);
        message.success(t('adminUsers.userUpdated'));
      } else {
        await api.post('/auth/admin/users/create/', values);
        message.success(t('adminUsers.userCreated'));
        navigate('/admin/users');
      }
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const firstErr = Object.values(detail).flat()[0];
        message.error(typeof firstErr === 'string' ? firstErr : t('adminUsers.failedUpdateUser'));
      } else {
        message.error(t('adminUsers.failedUpdateUser'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }} className="page-enter">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 28,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/users')}
          style={{ borderRadius: 10, border: '1px solid var(--border-color)' }}
        >
          {t('common.back')}
        </Button>
        <Title level={3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          {isEdit ? t('adminUsers.editUser') : t('adminUsers.createUser')}
        </Title>
      </div>

      {/* Form card */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        padding: 28,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ role: 'customer', user_type: 'personal', is_active: true }}
          requiredMark={false}
        >
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Form.Item
              name="first_name"
              label={<span style={{ fontWeight: 600 }}>{t('auth.firstName')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Input prefix={<UserOutlined style={{ color: 'var(--text-tertiary)' }} />} style={{ borderRadius: 10 }} />
            </Form.Item>
            <Form.Item
              name="last_name"
              label={<span style={{ fontWeight: 600 }}>{t('auth.lastName')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Input prefix={<UserOutlined style={{ color: 'var(--text-tertiary)' }} />} style={{ borderRadius: 10 }} />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 600 }}>{t('auth.email')}</span>}
            rules={[
              { required: true, message: t('common.required') },
              { type: 'email', message: t('auth.invalidEmail') },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: 'var(--text-tertiary)' }} />}
              disabled={isEdit}
              inputMode="email"
              autoComplete="email"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="phone_number"
            label={<span style={{ fontWeight: 600 }}>{t('auth.phone')}</span>}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: 'var(--text-tertiary)' }} />}
              inputMode="tel"
              autoComplete="tel"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Form.Item
              name="role"
              label={<span style={{ fontWeight: 600 }}>{t('adminUsers.role')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Select
                options={[
                  { value: 'customer', label: t('adminUsers.customer') },
                  { value: 'admin', label: t('common.admin') },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="user_type"
              label={<span style={{ fontWeight: 600 }}>{t('adminUsers.userType')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Select
                options={[
                  { value: 'personal', label: t('adminUsers.personal') },
                  { value: 'company', label: t('adminUsers.company') },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.user_type !== cur.user_type}>
            {({ getFieldValue }) =>
              getFieldValue('user_type') === 'company' ? (
                <div style={{
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-bg-strong)',
                  borderRadius: 12,
                  padding: '20px 20px 4px',
                  marginBottom: 20,
                }}>
                  <Form.Item
                    name="company_name"
                    label={<span style={{ fontWeight: 600 }}>{t('adminUsers.companyName')}</span>}
                    rules={[{ required: true, message: t('common.required') }]}
                  >
                    <Input prefix={<BankOutlined style={{ color: 'var(--text-tertiary)' }} />} style={{ borderRadius: 10 }} />
                  </Form.Item>
                  <Form.Item
                    name="company_id"
                    label={<span style={{ fontWeight: 600 }}>{t('auth.companyId')}</span>}
                    rules={[
                      { required: true, message: t('common.required') },
                      { pattern: /^\d{11}$/, message: t('auth.companyIdInvalid') },
                    ]}
                    extra={<span style={{ color: 'var(--text-tertiary)' }}>{t('auth.companyIdHelp')}</span>}
                  >
                    <Input
                      placeholder={t('auth.companyIdPlaceholder')}
                      maxLength={11}
                      inputMode="numeric"
                      style={{ borderRadius: 10 }}
                    />
                  </Form.Item>
                </div>
              ) : null
            }
          </Form.Item>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--bg-secondary)',
            borderRadius: 12, marginBottom: 20,
          }}>
            <div>
              <Text style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('common.active')}</Text>
              <br />
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Allow user to sign in
              </Text>
            </div>
            <Form.Item name="is_active" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          {!isEdit && (
            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600 }}>{t('auth.password')}</span>}
              rules={[
                { required: true, message: t('common.required') },
                { min: 8, message: t('auth.minPassword') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--text-tertiary)' }} />}
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              block
              size="large"
              style={{
                background: 'var(--accent)', borderColor: 'var(--accent)',
                borderRadius: 12, height: 48, fontWeight: 700,
                fontSize: 15,
              }}
            >
              {isEdit ? t('profile.saveChanges') : t('adminUsers.createUser')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
