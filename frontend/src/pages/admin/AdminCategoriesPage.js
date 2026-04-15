import React, { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Input, Switch, Space, Select,
  ColorPicker, message, Grid, Empty,
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
      title: '', width: 52,
      render: (_, record) => (
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `color-mix(in srgb, ${record.color || 'var(--accent)'} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, color: record.color || 'var(--accent)',
        }}>
          {getCategoryIcon(record.icon)}
        </div>
      ),
    },
    {
      title: t('adminUsers.name'), dataIndex: 'name', ellipsis: true,
      render: (name) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: t('adminCats.typeTransport'), dataIndex: 'requires_destination', width: 130,
      render: (v) => (
        <Tag color={v ? 'blue' : 'default'}>
          {v ? t('adminCats.typeTransport') : t('adminCats.typeOnSite')}
        </Tag>
      ),
    },
    {
      title: t('adminCats.color'), dataIndex: 'color', width: 110,
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5,
            background: c || 'var(--accent)',
            border: '1px solid var(--border-color)',
          }} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{c}</span>
        </div>
      ),
    },
    {
      title: t('adminOrders.status'), dataIndex: 'is_active', width: 90,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? t('common.active') : t('common.inactive')}
        </Tag>
      ),
    },
    {
      title: '', width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small" type="text"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); openModal(record); }}
            style={{ color: 'var(--accent)' }}
          />
          <Button
            size="small" type="text"
            danger={record.is_active}
            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={(e) => { e.stopPropagation(); toggleActive(record); }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <Title level={3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          {t('adminCats.title')}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 10, height: 40, fontWeight: 600,
          }}
        >
          {t('adminCats.newCategory')}
        </Button>
      </div>

      {/* Content */}
      {isMobile ? (
        loading && categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            {t('common.loading')}
          </div>
        ) : categories.length === 0 ? (
          <Empty description={t('adminCats.noCategories')} />
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 14,
                padding: '16px',
                marginBottom: 10,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: `color-mix(in srgb, ${cat.color || 'var(--accent)'} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: cat.color || 'var(--accent)', flexShrink: 0,
                }}>
                  {getCategoryIcon(cat.icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    {cat.name}
                  </Text>
                </div>
                <Tag color={cat.is_active ? 'green' : 'red'}>
                  {cat.is_active ? t('common.active') : t('common.inactive')}
                </Tag>
              </div>
              {cat.description && (
                <Text style={{ fontSize: 13, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
                  {cat.description}
                </Text>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  size="small" type="text"
                  icon={<EditOutlined />}
                  onClick={() => openModal(cat)}
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                >
                  Edit
                </Button>
                <Button
                  size="small" type="text"
                  danger={cat.is_active}
                  icon={cat.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                  onClick={() => toggleActive(cat)}
                />
              </div>
            </div>
          ))
        )
      ) : (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <Table
            columns={columns}
            dataSource={categories}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={false}
          />
        </div>
      )}

      {/* Modal */}
      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
            {editingCategory ? t('adminCats.editCategory') : t('adminCats.newCategory')}
          </span>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
        styles={{
          content: { borderRadius: 16, padding: 0 },
          header: { padding: '20px 24px 0', borderBottom: 'none' },
          body: { padding: '16px 24px 24px' },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => {
            const color = values.color;
            const submit = {
              ...values,
              color: typeof color === 'string' ? color : color?.toHexString?.() || '#00B856',
            };
            handleSave(submit);
          }}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>{t('adminUsers.name')}</span>}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('adminCats.categoryName')} style={{ borderRadius: 10 }} />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 600 }}>{t('orders.description')}</span>}
          >
            <TextArea rows={3} placeholder={t('adminCats.briefDesc')} style={{ borderRadius: 10 }} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 14 }}>
            <Form.Item
              name="icon"
              label={<span style={{ fontWeight: 600 }}>{t('adminCats.icon')}</span>}
              style={{ flex: 1 }}
            >
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
            <Form.Item
              name="color"
              label={<span style={{ fontWeight: 600 }}>{t('adminCats.color')}</span>}
            >
              <ColorPicker format="hex" />
            </Form.Item>
          </div>

          <Form.Item
            name="suggestion_keywords"
            label={<span style={{ fontWeight: 600 }}>{t('adminCats.suggestionKeywords')}</span>}
            extra={<span style={{ color: 'var(--text-tertiary)' }}>{t('adminCats.keywordsHelp')}</span>}
          >
            <TextArea rows={2} placeholder="keyword1, keyword2, keyword3" style={{ borderRadius: 10 }} />
          </Form.Item>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--bg-secondary)',
            borderRadius: 12, marginBottom: 16,
          }}>
            <div>
              <Text style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('adminCats.requiresDest')}
              </Text>
              <br />
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {t('adminCats.requiresDestHelp')}
              </Text>
            </div>
            <Form.Item name="requires_destination" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--bg-secondary)',
            borderRadius: 12, marginBottom: 20,
          }}>
            <Text style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('common.active')}
            </Text>
            <Form.Item name="is_active" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={saving}
              size="large"
              style={{
                background: 'var(--accent)', borderColor: 'var(--accent)',
                borderRadius: 12, height: 46, fontWeight: 700, fontSize: 15,
              }}
            >
              {editingCategory ? t('profile.saveChanges') : t('adminCats.newCategory')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
