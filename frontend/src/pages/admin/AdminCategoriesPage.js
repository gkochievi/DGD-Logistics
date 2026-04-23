import React, { useEffect, useMemo, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Input, Switch, Space,
  ColorPicker, message, Grid, Empty, Upload, Tabs,
} from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, CameraOutlined, DeleteOutlined, CheckOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import api from '../../api/client';
import { CategoryImage, getCategoryIcon, searchIcons, getIconMeta, AVAILABLE_ICONS } from '../../utils/categoryIcons';
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
  const [imageRemoved, setImageRemoved] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');

  // i18n fields managed as state (not via Form)
  const [catName, setCatName] = useState({ en: '', ka: '', ru: '' });
  const [catDesc, setCatDesc] = useState({ en: '', ka: '', ru: '' });
  // Non-i18n fields
  const [catIcon, setCatIcon] = useState('car');
  const [catColor, setCatColor] = useState('#00B856');
  const [catKeywords, setCatKeywords] = useState('');
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

  const filteredIcons = useMemo(() => searchIcons(iconSearch), [iconSearch]);
  const visibleCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (showArchived ? c.is_active !== false : c.is_active === false) return false;
      if (q) {
        const name = typeof c.name === 'object' ? Object.values(c.name).join(' ') : (c.name || '');
        const desc = typeof c.description === 'object' ? Object.values(c.description).join(' ') : (c.description || '');
        const hay = `${name} ${desc} ${c.suggestion_keywords || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [categories, showArchived, search]);

  const openModal = (category = null) => {
    setEditingCategory(category);
    setImageFile(null);
    setImagePreview(category?.image_url || null);
    setImageRemoved(false);
    setIconSearch('');
    if (category) {
      setCatName(typeof category.name === 'object' ? { en: '', ka: '', ru: '', ...category.name } : { en: category.name || '', ka: '', ru: '' });
      setCatDesc(typeof category.description === 'object' ? { en: '', ka: '', ru: '', ...category.description } : { en: category.description || '', ka: '', ru: '' });
      setCatIcon(category.icon || 'car');
      setCatColor(category.color || '#00B856');
      setCatKeywords(category.suggestion_keywords || '');
      setCatIsActive(category.is_active !== false);
    } else {
      setCatName({ en: '', ka: '', ru: '' });
      setCatDesc({ en: '', ka: '', ru: '' });
      setCatIcon('car');
      setCatColor('#00B856');
      setCatKeywords('');
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
      formData.append('icon', catIcon || 'car');
      formData.append('color', typeof catColor === 'string' ? catColor : catColor?.toHexString?.() || '#00B856');
      formData.append('suggestion_keywords', catKeywords);
      formData.append('is_active', catIsActive ? 'true' : 'false');
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imageRemoved) {
        formData.append('image', '');
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

  const handleImageSelect = (info) => {
    const file = info.file;
    setImageFile(file);
    setImageRemoved(false);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
  };

  const isMobile = !screens.md;

  const columns = [
    {
      title: '', width: 84,
      render: (_, record) => (
        <div style={{
          width: 68, height: 44, borderRadius: 10,
          background: `color-mix(in srgb, ${record.color || 'var(--accent)'} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: record.color || 'var(--accent)',
          overflow: 'hidden',
        }}>
          {record.image_url ? (
            <img src={record.image_url} alt="" style={{
              maxWidth: '100%', maxHeight: '100%',
              width: 'auto', height: 'auto',
              objectFit: 'contain', display: 'block',
            }} />
          ) : (
            <CategoryImage icon={record.icon} size={28} />
          )}
        </div>
      ),
    },
    {
      title: t('adminUsers.name'), dataIndex: 'name', ellipsis: true,
      render: (name) => <span style={{ fontWeight: 600 }}>{localized(name)}</span>,
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

      {/* Filter bar */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 14,
        padding: isMobile ? '14px 16px' : '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: 12, color: 'var(--text-tertiary)',
        }}>
          <FilterOutlined style={{ fontSize: 13 }} />
          <Text style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {t('common.filters')}
          </Text>
        </div>
        <Space wrap>
          <Input
            placeholder={t('common.search')}
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            allowClear
            style={{ width: 220, borderRadius: 10 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
            <Switch
              size="small"
              checked={showArchived}
              onChange={setShowArchived}
            />
            <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('common.showArchived')}
            </Text>
          </div>
        </Space>
      </div>

      {/* Content */}
      {isMobile ? (
        loading && visibleCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            {t('common.loading')}
          </div>
        ) : visibleCategories.length === 0 ? (
          <Empty description={t('adminCats.noCategories')} />
        ) : (
          visibleCategories.map((cat) => (
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
                  width: 72, height: 54, borderRadius: 12,
                  background: `color-mix(in srgb, ${cat.color || 'var(--accent)'} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: cat.color || 'var(--accent)', flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" style={{
                      maxWidth: '100%', maxHeight: '100%',
                      width: 'auto', height: 'auto',
                      objectFit: 'contain', display: 'block',
                    }} />
                  ) : (
                    <CategoryImage icon={cat.icon} size={32} />
                  )}
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
            dataSource={visibleCategories}
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
        width={isMobile ? '94vw' : 600}
        styles={{
          content: { borderRadius: 16, padding: 0 },
          header: { padding: isMobile ? '16px 18px 0' : '20px 24px 0', borderBottom: 'none' },
          body: { padding: isMobile ? '12px 18px 18px' : '16px 24px 24px' },
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
            extra={
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                {t('adminCats.imageIconHint') || 'When an image is uploaded, it replaces the icon.'}
              </span>
            }
          >
            <ImgCrop
              aspect={1}
              aspectSlider
              rotationSlider
              showReset
              showGrid
              modalTitle={t('adminCats.cropImage') || 'Adjust image'}
              modalOk={t('common.save') || 'Save'}
              modalCancel={t('common.cancel') || 'Cancel'}
              resetText={t('common.reset') || 'Reset'}
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
                    width: 84, height: 56, borderRadius: 12,
                    overflow: 'hidden', flexShrink: 0,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <img
                      src={imagePreview}
                      alt=""
                      style={{
                        maxWidth: '100%', maxHeight: '100%',
                        width: 'auto', height: 'auto',
                        objectFit: 'contain', display: 'block',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: 84, height: 56, borderRadius: 12,
                    background: `color-mix(in srgb, ${catColor} 12%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: catColor, flexShrink: 0,
                  }}>
                    {React.cloneElement(getCategoryIcon(catIcon), { style: { fontSize: 28 } })}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {imagePreview
                      ? (t('adminCats.changeImage') || 'Change image')
                      : (t('adminCats.uploadImage') || 'Upload image')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {imagePreview
                      ? 'PNG, JPG, SVG'
                      : (t('adminCats.iconFallbackHint') || 'No image — the icon below will be used.')}
                  </div>
                </div>
                {imagePreview && (
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveImage}
                    style={{ flexShrink: 0 }}
                  >
                    {t('adminCats.removeImage') || 'Remove'}
                  </Button>
                )}
              </div>
            </Upload>
            </ImgCrop>
          </Form.Item>

          {/* Icon picker */}
          <Form.Item
            label={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 600 }}>{t('adminCats.icon') || 'Icon'}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {filteredIcons.length}/{AVAILABLE_ICONS.length}
                  {getIconMeta(catIcon)?.label && ` · ${getIconMeta(catIcon).label}`}
                </span>
              </div>
            }
            extra={
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                {t('adminCats.iconHelp') || 'Shown when no image is uploaded.'}
              </span>
            }
          >
            <Input
              allowClear
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder={t('adminCats.searchIcons') || 'Search icons (e.g. car, crane, box, clock)'}
              prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
              style={{ borderRadius: 10, marginBottom: 10 }}
            />
            <div style={{
              maxHeight: 260,
              overflowY: 'auto',
              padding: 12,
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              border: '1px solid var(--border-color)',
            }}>
              {filteredIcons.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '24px 8px',
                  color: 'var(--text-tertiary)', fontSize: 13,
                }}>
                  {t('adminCats.noIconsMatch') || 'No icons match your search'}
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 42 : 48}px, 1fr))`,
                  gap: isMobile ? 6 : 8,
                }}>
                  {filteredIcons.map((iconKey) => {
                    const selected = catIcon === iconKey;
                    const meta = getIconMeta(iconKey);
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setCatIcon(iconKey)}
                        aria-pressed={selected}
                        aria-label={meta?.label || iconKey}
                        title={meta?.label || iconKey}
                        style={{
                          width: '100%', height: 48,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: selected
                            ? `2px solid ${catColor}`
                            : '1px solid var(--border-color)',
                          borderRadius: 10,
                          background: selected
                            ? `color-mix(in srgb, ${catColor} 14%, transparent)`
                            : 'var(--card-bg)',
                          color: selected ? catColor : 'var(--text-secondary)',
                          fontSize: 20,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        {getCategoryIcon(iconKey)}
                        {selected && (
                          <CheckOutlined
                            style={{
                              position: 'absolute',
                              top: -6, right: -6,
                              background: catColor,
                              color: '#fff',
                              borderRadius: '50%',
                              fontSize: 10,
                              padding: 3,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
