import React, { useEffect, useMemo, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Input, Select, Switch, Space,
  ColorPicker, message, Grid, Empty, Upload, Tabs,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined,
  DeleteOutlined, CheckOutlined, SearchOutlined, FilterOutlined,
} from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import api from '../../api/client';
import {
  CategoryImage, getCategoryIcon, searchIcons, getIconMeta, AVAILABLE_ICONS,
} from '../../utils/categoryIcons';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const LANG_TABS = [
  { key: 'en', label: '🇬🇧 EN' },
  { key: 'ka', label: '🇬🇪 KA' },
  { key: 'ru', label: '🇷🇺 RU' },
];

export default function AdminServicesPage() {
  const screens = useBreakpoint();
  const { t, lang } = useLang();
  const [services, setServices] = useState([]);
  const [carCategories, setCarCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');

  // i18n fields
  const [svcName, setSvcName] = useState({ en: '', ka: '', ru: '' });
  const [svcDesc, setSvcDesc] = useState({ en: '', ka: '', ru: '' });
  // Non-i18n fields
  const [svcIcon, setSvcIcon] = useState('tool');
  const [svcColor, setSvcColor] = useState('#00B856');
  const [svcKeywords, setSvcKeywords] = useState('');
  const [svcCarCategoryIds, setSvcCarCategoryIds] = useState([]);
  const [svcIsActive, setSvcIsActive] = useState(true);

  const localized = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['en'] || '';
  };

  const fetchServices = () => {
    setLoading(true);
    api.get('/services/admin/').then(({ data }) => {
      const results = data.results || data;
      setServices(Array.isArray(results) ? results : []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchCarCategories = () => {
    api.get('/categories/admin/').then(({ data }) => {
      const results = data.results || data;
      setCarCategories(Array.isArray(results) ? results : []);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchServices();
    fetchCarCategories();
  }, []);

  const filteredIcons = useMemo(() => searchIcons(iconSearch), [iconSearch]);
  const visibleServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (showArchived ? s.is_active !== false : s.is_active === false) return false;
      if (q) {
        const name = typeof s.name === 'object' ? Object.values(s.name).join(' ') : (s.name || '');
        const desc = typeof s.description === 'object' ? Object.values(s.description).join(' ') : (s.description || '');
        const hay = `${name} ${desc} ${s.suggestion_keywords || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [services, showArchived, search]);

  const openModal = (service = null) => {
    setEditingService(service);
    setImageFile(null);
    setImagePreview(service?.image_url || null);
    setImageRemoved(false);
    setIconSearch('');
    if (service) {
      setSvcName(typeof service.name === 'object' ? { en: '', ka: '', ru: '', ...service.name } : { en: service.name || '', ka: '', ru: '' });
      setSvcDesc(typeof service.description === 'object' ? { en: '', ka: '', ru: '', ...service.description } : { en: service.description || '', ka: '', ru: '' });
      setSvcIcon(service.icon || 'tool');
      setSvcColor(service.color || '#00B856');
      setSvcKeywords(service.suggestion_keywords || '');
      setSvcCarCategoryIds(Array.isArray(service.car_categories) ? service.car_categories : []);
      setSvcIsActive(service.is_active !== false);
    } else {
      setSvcName({ en: '', ka: '', ru: '' });
      setSvcDesc({ en: '', ka: '', ru: '' });
      setSvcIcon('tool');
      setSvcColor('#00B856');
      setSvcKeywords('');
      setSvcCarCategoryIds([]);
      setSvcIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!svcName.en && !svcName.ka && !svcName.ru) {
      message.error(t('common.required'));
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', JSON.stringify(svcName));
      formData.append('description', JSON.stringify(svcDesc));
      formData.append('icon', svcIcon || 'tool');
      formData.append('color', typeof svcColor === 'string' ? svcColor : svcColor?.toHexString?.() || '#00B856');
      formData.append('suggestion_keywords', svcKeywords);
      formData.append('is_active', svcIsActive ? 'true' : 'false');
      formData.append('car_categories', JSON.stringify(svcCarCategoryIds));
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imageRemoved) {
        formData.append('image', '');
      }

      if (editingService) {
        await api.patch(`/services/admin/${editingService.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success(t('adminServices.serviceUpdated'));
      } else {
        await api.post('/services/admin/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success(t('adminServices.serviceCreated'));
      }
      setModalOpen(false);
      fetchServices();
    } catch (err) {
      const detail = err.response?.data;
      const firstErr = detail ? Object.values(detail).flat()[0] : t('adminServices.failedUpdateSvc');
      message.error(typeof firstErr === 'string' ? firstErr : t('adminServices.failedUpdateSvc'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (svc) => {
    try {
      await api.patch(`/services/admin/${svc.id}/`, { is_active: !svc.is_active });
      message.success(svc.is_active ? t('adminServices.serviceDeactivated') : t('adminServices.serviceActivated'));
      fetchServices();
    } catch {
      message.error(t('adminServices.failedUpdateSvc'));
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

  // Dropdown only offers active car categories, but if a service is already
  // linked to a now-inactive one, keep it in the option list so the tag renders
  // with its name (and flag it "(inactive)" + disabled so it can't be re-added
  // after removal).
  const carCategoryOptions = carCategories
    .filter((c) => c.is_active !== false || svcCarCategoryIds.includes(c.id))
    .map((c) => {
      const inactive = c.is_active === false;
      const baseLabel = localized(c.name) || `#${c.id}`;
      return {
        value: c.id,
        label: inactive ? `${baseLabel} (${t('common.inactive')})` : baseLabel,
        disabled: inactive,
      };
    });

  const renderCarCategoryTags = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</Text>;
    }
    return (
      <Space size={4} wrap>
        {ids.slice(0, 3).map((id) => {
          const cat = carCategories.find((c) => c.id === id);
          return (
            <Tag key={id} color={cat?.color || 'default'} style={{ margin: 0 }}>
              {cat ? localized(cat.name) : `#${id}`}
            </Tag>
          );
        })}
        {ids.length > 3 && (
          <Tag style={{ margin: 0 }}>+{ids.length - 3}</Tag>
        )}
      </Space>
    );
  };

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
          <CategoryImage imageUrl={record.image_url} icon={record.icon} size={record.image_url ? 44 : 32} />
        </div>
      ),
    },
    {
      title: t('adminUsers.name'), dataIndex: 'name', ellipsis: true,
      render: (name) => <span style={{ fontWeight: 600 }}>{localized(name)}</span>,
    },
    {
      title: t('adminServices.carCategories'), dataIndex: 'car_categories', width: 260,
      render: renderCarCategoryTags,
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
          {t('adminServices.title')}
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
          {t('adminServices.newService')}
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
        loading && visibleServices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            {t('common.loading')}
          </div>
        ) : visibleServices.length === 0 ? (
          <Empty description={t('adminServices.noServices')} />
        ) : (
          visibleServices.map((svc) => (
            <div
              key={svc.id}
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
                  background: `color-mix(in srgb, ${svc.color || 'var(--accent)'} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: svc.color || 'var(--accent)', flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  <CategoryImage imageUrl={svc.image_url} icon={svc.icon} size={svc.image_url ? 48 : 36} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    {localized(svc.name)}
                  </Text>
                </div>
                <Tag color={svc.is_active ? 'green' : 'red'}>
                  {svc.is_active ? t('common.active') : t('common.inactive')}
                </Tag>
              </div>
              {localized(svc.description) && (
                <Text style={{ fontSize: 13, color: 'var(--text-tertiary)', display: 'block', marginBottom: 8 }}>
                  {localized(svc.description)}
                </Text>
              )}
              <div style={{ marginBottom: 8 }}>
                {renderCarCategoryTags(svc.car_categories)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  size="small" type="text"
                  icon={<EditOutlined />}
                  onClick={() => openModal(svc)}
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                >
                  Edit
                </Button>
                <Button
                  size="small" type="text"
                  danger={svc.is_active}
                  icon={svc.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                  onClick={() => toggleActive(svc)}
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
            dataSource={visibleServices}
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
            {editingService ? t('adminServices.editService') : t('adminServices.newService')}
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
                    value={svcName[tab.key] || ''}
                    onChange={(e) => setSvcName((prev) => ({ ...prev, [tab.key]: e.target.value }))}
                    placeholder={t('adminServices.serviceName')}
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
                    value={svcDesc[tab.key] || ''}
                    onChange={(e) => setSvcDesc((prev) => ({ ...prev, [tab.key]: e.target.value }))}
                    rows={3}
                    placeholder={t('adminCats.briefDesc')}
                    style={{ borderRadius: 10 }}
                  />
                ),
              }))}
              style={{ marginTop: -8 }}
            />
          </Form.Item>

          {/* Car categories (M2M) */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('adminServices.carCategories')}</span>}
            extra={
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                {t('adminServices.carCategoriesHelp')}
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              value={svcCarCategoryIds}
              onChange={setSvcCarCategoryIds}
              options={carCategoryOptions}
              placeholder={t('adminServices.selectCarCategories')}
              style={{ width: '100%', borderRadius: 10 }}
              optionFilterProp="label"
            />
          </Form.Item>

          {/* Image Upload */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('adminCats.image')}</span>}
            extra={
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                {t('adminCats.imageIconHint')}
              </span>
            }
          >
            <ImgCrop
              aspect={1}
              rotationSlider
              showReset
              showGrid
              modalTitle={t('adminCats.cropImage')}
              modalOk={t('common.save')}
              modalCancel={t('common.cancel')}
              resetText={t('common.reset')}
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
                    background: `color-mix(in srgb, ${svcColor} 12%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: svcColor, flexShrink: 0,
                  }}>
                    {React.cloneElement(getCategoryIcon(svcIcon), { style: { fontSize: 28 } })}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {imagePreview
                      ? t('adminCats.changeImage')
                      : t('adminCats.uploadImage')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {imagePreview
                      ? 'PNG, JPG, SVG'
                      : t('adminCats.iconFallbackHint')}
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
                    {t('adminCats.removeImage')}
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
                <span style={{ fontWeight: 600 }}>{t('adminCats.icon')}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {filteredIcons.length}/{AVAILABLE_ICONS.length}
                  {getIconMeta(svcIcon)?.label && ` · ${getIconMeta(svcIcon).label}`}
                </span>
              </div>
            }
            extra={
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                {t('adminCats.iconHelp')}
              </span>
            }
          >
            <Input
              allowClear
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder={t('adminCats.searchIcons')}
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
                  {t('adminCats.noIconsMatch')}
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 42 : 48}px, 1fr))`,
                  gap: isMobile ? 6 : 8,
                }}>
                  {filteredIcons.map((iconKey) => {
                    const selected = svcIcon === iconKey;
                    const meta = getIconMeta(iconKey);
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setSvcIcon(iconKey)}
                        aria-pressed={selected}
                        aria-label={meta?.label || iconKey}
                        title={meta?.label || iconKey}
                        style={{
                          width: '100%', height: 48,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: selected
                            ? `2px solid ${svcColor}`
                            : '1px solid var(--border-color)',
                          borderRadius: 10,
                          background: selected
                            ? `color-mix(in srgb, ${svcColor} 14%, transparent)`
                            : 'var(--card-bg)',
                          color: selected ? svcColor : 'var(--text-secondary)',
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
                              background: svcColor,
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
              value={svcColor}
              onChange={(c) => setSvcColor(c.toHexString())}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 600 }}>{t('adminCats.suggestionKeywords')}</span>}
            extra={<span style={{ color: 'var(--text-tertiary)' }}>{t('adminCats.keywordsHelp')}</span>}
          >
            <TextArea
              rows={2}
              value={svcKeywords}
              onChange={(e) => setSvcKeywords(e.target.value)}
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
            <Switch checked={svcIsActive} onChange={setSvcIsActive} />
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
              {editingService ? t('profile.saveChanges') : t('adminServices.newService')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
