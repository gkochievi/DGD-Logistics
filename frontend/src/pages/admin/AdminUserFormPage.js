import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Select, Switch, Typography, message, Spin, Space,
} from 'antd';
import { ArrowLeftOutlined, UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';

const { Title } = Typography;

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

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/users')}>{t('common.back')}</Button>
        <Title level={4} style={{ margin: 0 }}>{isEdit ? t('adminUsers.editUser') : t('adminUsers.createUser')}</Title>
      </Space>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}
          initialValues={{ role: 'customer', user_type: 'personal', is_active: true }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Form.Item name="first_name" label={t('auth.firstName')} rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1, minWidth: 200 }}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="last_name" label={t('auth.lastName')} rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1, minWidth: 200 }}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </div>

          <Form.Item name="email" label={t('auth.email')} rules={[
            { required: true, message: t('common.required') },
            { type: 'email', message: t('auth.invalidEmail') },
          ]}>
            <Input prefix={<MailOutlined />} disabled={isEdit} inputMode="email" autoComplete="email" />
          </Form.Item>

          <Form.Item name="phone_number" label={t('auth.phone')}>
            <Input prefix={<PhoneOutlined />} inputMode="tel" autoComplete="tel" />
          </Form.Item>

          <Form.Item name="role" label={t('adminUsers.role')} rules={[{ required: true, message: t('common.required') }]}>
            <Select options={[
              { value: 'customer', label: t('adminUsers.customer') },
              { value: 'admin', label: t('common.admin') },
            ]} />
          </Form.Item>

          <Form.Item name="user_type" label={t('adminUsers.userType')} rules={[{ required: true, message: t('common.required') }]}>
            <Select options={[
              { value: 'personal', label: t('adminUsers.personal') },
              { value: 'company', label: t('adminUsers.company') },
            ]} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.user_type !== cur.user_type}>
            {({ getFieldValue }) =>
              getFieldValue('user_type') === 'company' ? (
                <>
                  <Form.Item name="company_name" label={t('adminUsers.companyName')} rules={[{ required: true, message: t('common.required') }]}>
                    <Input prefix={<BankOutlined />} />
                  </Form.Item>
                  <Form.Item
                    name="company_id"
                    label={t('auth.companyId')}
                    rules={[
                      { required: true, message: t('common.required') },
                      { pattern: /^\d{11}$/, message: t('auth.companyIdInvalid') },
                    ]}
                    extra={t('auth.companyIdHelp')}
                  >
                    <Input placeholder={t('auth.companyIdPlaceholder')} maxLength={11} inputMode="numeric" />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item name="is_active" label={t('common.active')} valuePropName="checked">
            <Switch />
          </Form.Item>

          {!isEdit && (
            <Form.Item name="password" label={t('auth.password')} rules={[
              { required: true, message: t('common.required') },
              { min: 8, message: t('auth.minPassword') },
            ]}>
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              {isEdit ? t('profile.saveChanges') : t('adminUsers.createUser')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
