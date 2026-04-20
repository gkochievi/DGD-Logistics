import React, { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Input, Switch, Space,
  ColorPicker, message, Grid, Empty, Upload, Tabs,
} from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, CameraOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { CategoryImage } from '../../utils/categoryIcons';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const LANG_TABS = [
  { key: 'en', label: '🇬🇧 EN' },
  { key: 'ka', label: '🇬🇪 KA' },
  { key: 'ru', label: '🇷🇺 RU' },
];

export default function AdminCategoriesPage() {
  const screens = useBreakpoint();
  const { t, lang } = useLang();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // i18n fields managed as state (not via Form)
  const [catName, setCatName] = useState({ en: '', ka: '', ru: '' });
  const [catDesc, setCatDesc] = useState({ en: '', ka: '', ru: '' });
  // Non-i18n fields
  const [catColor, setCatColor] = useState('#00B856');
  const [catKeywords, setCatKeywords] = useState('');
  const [catRequiresDest, setCatRequiresDest] = useState(false);
  const [catIsActive, setCatIsActive] = useState(true);

  // Helper: resolve i18n field to current language
  const localized = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['en'] || '';
  };

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
    setImageFile(null);
    setImagePreview(category?.image_url || null);
    if (category) {
      setCatName(typeof category.name === 'object' ? { en: '', ka: '', ru: '', ...category.name } : { en: category.name || '', ka: '', ru: '' });
      setCatDesc(typeof category.description === 'object' ? { en: '', ka: '', ru: '', ...category.description } : { en: category.description || '', ka: '', ru: '' });
      setCatColor(category.color || '#00B856');
      setCatKeywords(category.suggestion_keywords || '');
      setCatRequiresDest(category.requires_destination || false);
      setCatIsActive(category.is_active !== false);
    } else {
      setCatName({ en: '', ka: '', ru: '' });
      setCatDesc({ en: '', ka: '', ru: '' });
      setCatColor('#00B856');
      setCatKeywords('');
      setCatRequiresDest(false);
      setCatIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!catName.en && !catName.ka && !catName.ru) {
      message.error(t('common.required'));
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', JSON.stringify(catName));
      formData.append('description', JSON.stringify(catDesc));
      formData.append('color', typeof catColor === 'string' ? catColor : catColor?.toHexString?.() || '#00B856');
      formData.append('suggestion_keywords', catKeywords);
      formData.append('requires_destination', catRequiresDest ? 'true' : 'false');
      formData.append('is_active', catIsActive ? 'true' : 'false');
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingCategory) {
        await api.patch(`/categories/admin/${editingCategory.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success(t('adminCats.categoryUpdated'));
      } else {
        await api.post('/categories/admin/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
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

  const deleteCategory = (cat) => {
    Modal.confirm({
      title: t('adminCats.deleteConfirmTitle'),
      content: t('adminCats.deleteConfirmContent', { name: localized(cat.name) }),
      okText: t('adminCats.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await api.delete(`/categories/admin/${cat.id}/`);
          message.success(t('adminCats.categoryDeleted'));
          fetchCategories();
        } catch {
          message.error(t('adminCats.failedDeleteCat'));
        }
      },
    });
  };

  const handleImageSelect = (info) => {
    const file = info.file;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const isMobile = !screens.md;

  const columns = [
    {
      title: '', width: 60,
      render: (_, record) => (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `color-mix(in srgb, ${record.color || 'var(--accent)'} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: record.color || 'var(--accent)',
          overflow: 'hidden',
        }}>
          <CategoryImage imageUrl={record.image_url} icon={record.icon} size={32} />
        </div>
      ),
    },
    {
      title: t('adminUsers.name'), dataIndex: 'name', ellipsis: true,
      render: (name) => <span style={{ fontWeight: 600 }}>{localized(name)}</span>,
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
      title: '', width: 120,
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
          <Button
            size="small" type="text" danger
            icon={<DeleteOutlined />}
            onClick={(e) => { e.stopPropagation(); deleteCategory(record); }}
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
                  width: 48, height: 48, borderRadius: 14,
                  background: `color-mix(in srgb, ${cat.color || 'var(--accent)'} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: cat.color || 'var(--accent)', flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  <CategoryImage imageUrl={cat.image_url} icon={cat.icon} size={36} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    {localized(cat.name)}
                  </Text>
                </div>
                <Tag color={cat.is_active ? 'green' : 'red'}>
                  {cat.is_active ? t('common.active') : t('common.inactive')}
                </Tag>
              </div>
              {localized(cat.description) && (
                <Text style={{ fontSize: 13, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
                  {localized(cat.description)}
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
                <Button
                  size="small" type="text" danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteCategory(cat)}
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
        <Form layout="vertical" requiredMark={false}>
          {/* Name (i18n) */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('adminUsers.name')}</span>}
            required
          >
            <Tabs
              size="small"
              items={LANG_TABS.map((tab) => ({
                key: tab.key,
                label: tab.label,
                children: (
                  <Input
                    value={catName[tab.key] || ''}
                    onChange={(e) => setCatName((prev) => ({ ...prev, [tab.key]: e.target.value }))}
                    placeholder={t('adminCats.categoryName')}
                    style={{ borderRadius: 10 }}
                  />
                ),
              }))}
              style={{ marginTop: -8 }}
            />
          </Form.Item>

          {/* Description (i18n) */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('orders.description')}</span>}
          >
            <Tabs
              size="small"
              items={LANG_TABS.map((tab) => ({
                key: tab.key,
                label: tab.label,
                children: (
                  <TextArea
                    value={catDesc[tab.key] || ''}
                    onChange={(e) => setCatDesc((prev) => ({ ...prev, [tab.key]: e.target.value }))}
                    rows={3}
                    placeholder={t('adminCats.briefDesc')}
                    style={{ borderRadius: 10 }}
                  />
                ),
              }))}
              style={{ marginTop: -8 }}
            />
          </Form.Item>

          {/* Image Upload */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('adminCats.image') || 'Image'}</span>}
          >
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                handleImageSelect({ file });
                return false;
              }}
            >
              <div style={{
                width: '100%',
                border: '2px dashed var(--border-color)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                background: 'var(--bg-secondary)',
              }}>
                {imagePreview ? (
                  <div style={{
                    width: 56, height: 56, borderRadius: 12,
                    overflow: 'hidden', flexShrink: 0,
                    border: '1px solid var(--border-color)',
                  }}>
                    <img
                      src={imagePreview}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: 12,
                    background: 'var(--bg-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: 'var(--text-placeholder)', flexShrink: 0,
                  }}>
                    <CameraOutlined />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {imagePreview ? (t('adminCats.changeImage') || 'Change image') : (t('adminCats.uploadImage') || 'Upload image')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    PNG, JPG, SVG
                  </div>
                </div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('adminCats.color')}</span>}
          >
            <ColorPicker
              format="hex"
              value={catColor}
              onChange={(c) => setCatColor(c.toHexString())}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('adminCats.suggestionKeywords')}</span>}
            extra={<span style={{ color: 'var(--text-tertiary)' }}>{t('adminCats.keywordsHelp')}</span>}
          >
            <TextArea
              rows={2}
              value={catKeywords}
              onChange={(e) => setCatKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
              style={{ borderRadius: 10 }}
            />
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
            <Switch checked={catRequiresDest} onChange={setCatRequiresDest} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--bg-secondary)',
            borderRadius: 12, marginBottom: 20,
          }}>
            <Text style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('common.active')}
            </Text>
            <Switch checked={catIsActive} onChange={setCatIsActive} />
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              block
              loading={saving}
              size="large"
              onClick={handleSave}
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
