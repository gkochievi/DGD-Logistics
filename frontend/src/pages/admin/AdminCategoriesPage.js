import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Typography, Tag, Modal, Form, Input, Switch, Space, Select, ColorPicker,
  message, Grid, List, Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { getCategoryIcon, AVAILABLE_ICONS } from '../../utils/categoryIcons';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

export default function AdminCategoriesPage() {
  const screens = useBreakpoint();
  const { t } = useLang();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    api.get('/categories/admin/').then(({ data }) => {
      const results = data.results || data;
      setCategories(Array.isArray(results) ? results : []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const openModal = (category = null) => {
    setEditingCategory(category);
    if (category) {
      form.setFieldsValue(category);
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      if (editingCategory) {
        await api.patch(`/categories/admin/${editingCategory.id}/`, values);
        message.success(t('adminCats.categoryUpdated'));
      } else {
        await api.post('/categories/admin/', values);
        message.success(t('adminCats.categoryCreated'));
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      const detail = err.response?.data;
      const firstErr = detail ? Object.values(detail).flat()[0] : t('adminCats.failedUpdateCat');
      message.error(typeof firstErr === 'string' ? firstErr : t('adminCats.failedUpdateCat'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat) => {
    try {
      await api.patch(`/categories/admin/${cat.id}/`, { is_active: !cat.is_active });
      message.success(cat.is_active ? t('adminCats.categoryDeactivated') : t('adminCats.categoryActivated'));
      fetchCategories();
    } catch {
      message.error(t('adminCats.failedUpdateCat'));
    }
  };

  const isMobile = !screens.md;

  const columns = [
    {
      title: '', width: 48,
      render: (_, record) => (
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${record.color || '#1677ff'}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: record.color || '#1677ff',
        }}>
          {getCategoryIcon(record.icon)}
        </div>
      ),
    },
    { title: t('adminUsers.name'), dataIndex: 'name', ellipsis: true },
    {
      title: t('adminCats.typeTransport'), dataIndex: 'requires_destination', width: 120,
      render: (v) => <Tag color={v ? 'blue' : 'default'}>{v ? t('adminCats.typeTransport') : t('adminCats.typeOnSite')}</Tag>,
    },
    {
      title: t('adminCats.color'), dataIndex: 'color', width: 100,
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: c || '#1677ff' }} />
          <span style={{ fontSize: 12, color: '#999' }}>{c}</span>
        </div>
      ),
    },
    {
      title: t('adminOrders.status'), dataIndex: 'is_active', width: 90,
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? t('common.active') : t('common.inactive')}</Tag>,
    },
    {
      title: '', width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Button
            size="small" type="text"
            danger={record.is_active}
            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => toggleActive(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('adminCats.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          {t('adminCats.newCategory')}
        </Button>
      </div>

      {isMobile ? (
        <List
          loading={loading}
          dataSource={categories}
          locale={{ emptyText: <Empty description={t('adminCats.noCategories')} /> }}
          renderItem={(cat) => (
            <Card size="small" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${cat.color || '#1677ff'}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: cat.color || '#1677ff', flexShrink: 0,
                }}>
                  {getCategoryIcon(cat.icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{cat.name}</strong>
                </div>
                <Tag color={cat.is_active ? 'green' : 'red'}>{cat.is_active ? t('common.active') : t('common.inactive')}</Tag>
              </div>
              {cat.description && <Text type="secondary" style={{ fontSize: 13 }}>{cat.description}</Text>}
              <div style={{ marginTop: 8 }}>
                <Space size={4}>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openModal(cat)} />
                  <Button
                    size="small" type="text"
                    danger={cat.is_active}
                    icon={cat.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => toggleActive(cat)}
                  />
                </Space>
              </div>
            </Card>
          )}
        />
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <Table columns={columns} dataSource={categories} rowKey="id" loading={loading} size="middle" pagination={false} />
        </Card>
      )}

      <Modal
        title={editingCategory ? t('adminCats.editCategory') : t('adminCats.newCategory')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(values) => {
          const color = values.color;
          const submit = {
            ...values,
            color: typeof color === 'string' ? color : color?.toHexString?.() || '#1677ff',
          };
          handleSave(submit);
        }}>
          <Form.Item name="name" label={t('adminUsers.name')} rules={[{ required: true, message: t('common.required') }]}>
            <Input placeholder={t('adminCats.categoryName')} />
          </Form.Item>
          <Form.Item name="description" label={t('orders.description')}>
            <TextArea rows={3} placeholder={t('adminCats.briefDesc')} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="icon" label={t('adminCats.icon')} style={{ flex: 1 }}>
              <Select
                placeholder={t('adminCats.selectIcon')}
                showSearch
                options={AVAILABLE_ICONS.map((name) => ({
                  value: name,
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getCategoryIcon(name)}
                      <span>{name}</span>
                    </span>
                  ),
                }))}
              />
            </Form.Item>
            <Form.Item name="color" label={t('adminCats.color')}>
              <ColorPicker format="hex" />
            </Form.Item>
          </div>

          <Form.Item name="suggestion_keywords" label={t('adminCats.suggestionKeywords')}
            extra={t('adminCats.keywordsHelp')}>
            <TextArea rows={2} placeholder="keyword1, keyword2, keyword3" />
          </Form.Item>
          <Form.Item name="requires_destination" label={t('adminCats.requiresDest')} valuePropName="checked"
            extra={t('adminCats.requiresDestHelp')}>
            <Switch />
          </Form.Item>
          <Form.Item name="is_active" label={t('common.active')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={saving}>
              {editingCategory ? t('profile.saveChanges') : t('adminCats.newCategory')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
