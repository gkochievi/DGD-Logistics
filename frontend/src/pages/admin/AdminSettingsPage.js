import React, { useEffect, useState } from 'react';
import {
  Button, Typography, Form, Input, Space, message, Grid, Upload,
  Select, Spin, Radio, TimePicker, Switch, Modal, Popconfirm,
} from 'antd';
import {
  SaveOutlined, UploadOutlined, GlobalOutlined,
  BgColorsOutlined, CheckOutlined, EnvironmentOutlined,
  ClockCircleOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';
import { useBranding } from '../../contexts/BrandingContext';
import { COLOR_THEMES, DEFAULT_COLOR_THEME, applyColorTheme } from '../../utils/colorThemes';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const COUNTRY_OPTIONS = [
  { code: 'ge', name: 'Georgia', flag: '🇬🇪' },
  { code: 'tr', name: 'Turkey', flag: '🇹🇷' },
  { code: 'az', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'am', name: 'Armenia', flag: '🇦🇲' },
  { code: 'ru', name: 'Russia', flag: '🇷🇺' },
  { code: 'ua', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'pl', name: 'Poland', flag: '🇵🇱' },
  { code: 'bg', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'ro', name: 'Romania', flag: '🇷🇴' },
  { code: 'gr', name: 'Greece', flag: '🇬🇷' },
  { code: 'kz', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'il', name: 'Israel', flag: '🇮🇱' },
  { code: 'ae', name: 'UAE', flag: '🇦🇪' },
  { code: 'cn', name: 'China', flag: '🇨🇳' },
];

export default function AdminSettingsPage() {
  const screens = useBreakpoint();
  const { t } = useLang();
  const { setColorTheme, refresh: refreshBranding } = useBranding();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);

  const [windowModal, setWindowModal] = useState({ open: false, editing: null });

  const load = () => {
    setLoading(true);
    return api.get('/site-settings/admin/').then(({ data }) => {
      setData(data);
      setLogoPreview(data.site_logo_url || null);
      setFaviconPreview(data.favicon_url || null);
    }).catch(() => message.error(t('adminSettings.loadFailed')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('site_name', data.site_name || '');
      fd.append('color_theme', data.color_theme || DEFAULT_COLOR_THEME);
      fd.append('default_search_scope', data.default_search_scope || 'georgia');
      fd.append('default_search_countries', JSON.stringify(data.default_search_countries || []));
      if (logoFile) fd.append('site_logo', logoFile);
      if (faviconFile) fd.append('favicon', faviconFile);

      await api.put('/site-settings/admin/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setColorTheme(data.color_theme || DEFAULT_COLOR_THEME);
      await refreshBranding();
      setLogoFile(null);
      setFaviconFile(null);
      message.success(t('adminSettings.saved'));
    } catch (err) {
      message.error(t('adminSettings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const openNewWindow = () => setWindowModal({ open: true, editing: null });
  const openEditWindow = (w) => setWindowModal({ open: true, editing: w });
  const closeWindowModal = () => setWindowModal({ open: false, editing: null });

  const saveWindow = async (payload) => {
    try {
      if (windowModal.editing) {
        await api.put(`/site-settings/admin/time-windows/${windowModal.editing.id}/`, payload);
      } else {
        await api.post('/site-settings/admin/time-windows/', payload);
      }
      message.success(t('adminSettings.windowSaved'));
      closeWindowModal();
      await load();
      await refreshBranding();
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const firstErr = Object.values(detail).flat()[0];
        message.error(typeof firstErr === 'string' ? firstErr : t('adminSettings.windowSaveFailed'));
      } else message.error(t('adminSettings.windowSaveFailed'));
    }
  };

  const deleteWindow = async (id) => {
    try {
      await api.delete(`/site-settings/admin/time-windows/${id}/`);
      message.success(t('adminSettings.windowDeleted'));
      await load();
      await refreshBranding();
    } catch {
      message.error(t('adminSettings.windowDeleteFailed'));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const cardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: isMobile ? 16 : 24,
    marginBottom: 20,
  };

  const sectionTitleStyle = {
    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
    marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
  };

  const inputStyle = { borderRadius: 10 };

  return (
    <div className="page-enter">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <Title level={3} style={{
            margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            {t('adminSettings.title')}
          </Title>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
            {t('adminSettings.subtitle')}
          </Text>
        </div>
        <Button
          type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 10, height: 40, fontWeight: 600,
          }}
        >
          {t('adminSettings.save')}
        </Button>
      </div>

      {/* ── Branding ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <GlobalOutlined style={{ color: 'var(--accent)' }} />
          {t('adminSettings.brandingSection')}
        </div>

        <Form layout="vertical" requiredMark={false}>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminSettings.siteName')}</span>}>
            <Input
              value={data.site_name}
              onChange={(e) => updateField('site_name', e.target.value)}
              style={inputStyle}
              placeholder="Heavyy Way"
            />
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {t('adminSettings.siteNameHint')}
            </div>
          </Form.Item>

          <div style={{ display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminSettings.siteLogo')}</span>}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {logoPreview && (
                    <img
                      src={logoPreview} alt="Logo"
                      style={{
                        width: 48, height: 48, objectFit: 'contain',
                        borderRadius: 10, border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                      }}
                    />
                  )}
                  <Upload
                    beforeUpload={(file) => {
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                      return false;
                    }}
                    showUploadList={false}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />} style={{ borderRadius: 10 }}>
                      {t('adminSettings.uploadLogo')}
                    </Button>
                  </Upload>
                  {logoPreview && (
                    <Button danger type="text" onClick={() => {
                      setLogoFile(null); setLogoPreview(null); updateField('site_logo', null);
                    }}>
                      {t('adminSettings.removeImage')}
                    </Button>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {t('adminSettings.siteLogoHint')}
                </div>
              </Form.Item>
            </div>

            <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
              <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminSettings.favicon')}</span>}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {faviconPreview && (
                    <img
                      src={faviconPreview} alt="Favicon"
                      style={{
                        width: 32, height: 32, objectFit: 'contain',
                        borderRadius: 6, border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                      }}
                    />
                  )}
                  <Upload
                    beforeUpload={(file) => {
                      setFaviconFile(file);
                      setFaviconPreview(URL.createObjectURL(file));
                      return false;
                    }}
                    showUploadList={false}
                    accept="image/png,image/x-icon,image/svg+xml"
                  >
                    <Button icon={<UploadOutlined />} style={{ borderRadius: 10 }}>
                      {t('adminSettings.uploadFavicon')}
                    </Button>
                  </Upload>
                  {faviconPreview && (
                    <Button danger type="text" onClick={() => {
                      setFaviconFile(null); setFaviconPreview(null); updateField('favicon', null);
                    }}>
                      {t('adminSettings.removeImage')}
                    </Button>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {t('adminSettings.faviconHint')}
                </div>
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>

      {/* ── Color Theme ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <BgColorsOutlined style={{ color: 'var(--accent)' }} />
          {t('adminSettings.colorThemeSection')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
          {t('adminSettings.colorThemeHint')}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 110 : 130}px, 1fr))`,
          gap: 12,
        }}>
          {Object.entries(COLOR_THEMES).map(([key, theme]) => {
            const selected = (data.color_theme || DEFAULT_COLOR_THEME) === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  updateField('color_theme', key);
                  applyColorTheme(key);
                }}
                style={{
                  cursor: 'pointer',
                  background: selected ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                  border: `2px solid ${selected ? theme.swatch : 'var(--border-color)'}`,
                  borderRadius: 14, padding: '14px 12px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8,
                  transition: 'all 0.15s ease', position: 'relative',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: theme.swatch,
                  boxShadow: `0 4px 12px ${theme.swatch}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <CheckOutlined style={{ color: '#fff', fontSize: 18 }} />}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                  {theme.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Location Scope ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <EnvironmentOutlined style={{ color: 'var(--accent)' }} />
          {t('adminSettings.locationSection')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
          {t('adminSettings.locationHint')}
        </div>

        <Form layout="vertical" requiredMark={false}>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminSettings.searchScope')}</span>}>
            <Radio.Group
              value={data.default_search_scope || 'georgia'}
              onChange={(e) => {
                updateField('default_search_scope', e.target.value);
                if (e.target.value !== 'custom') updateField('default_search_countries', []);
              }}
            >
              <Space direction="vertical" style={{ gap: 10 }}>
                <Radio value="georgia" style={{ fontWeight: 500 }}>🇬🇪 {t('adminSettings.scopeGeorgia')}</Radio>
                <Radio value="worldwide" style={{ fontWeight: 500 }}>🌍 {t('adminSettings.scopeWorldwide')}</Radio>
                <Radio value="custom" style={{ fontWeight: 500 }}>🗺️ {t('adminSettings.scopeCustom')}</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {data.default_search_scope === 'custom' && (
            <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminSettings.searchCountries')}</span>}>
              <Select
                mode="multiple"
                value={data.default_search_countries || []}
                onChange={(val) => updateField('default_search_countries', val)}
                placeholder={t('adminSettings.selectCountries')}
                style={{ borderRadius: 10 }}
                optionFilterProp="label"
                options={COUNTRY_OPTIONS.map((c) => ({
                  value: c.code,
                  label: `${c.flag} ${c.name}`,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </div>

      {/* ── Time Restrictions ── */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ ...sectionTitleStyle, marginBottom: 0 }}>
            <ClockCircleOutlined style={{ color: 'var(--accent)' }} />
            {t('adminSettings.restrictedTimesSection')}
          </div>
          <Button
            type="primary" icon={<PlusOutlined />} onClick={openNewWindow}
            style={{
              background: 'var(--accent)', borderColor: 'var(--accent)',
              borderRadius: 10, fontWeight: 600,
            }}
          >
            {t('adminSettings.addWindow')}
          </Button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
          {t('adminSettings.restrictedTimesHint')}
        </div>

        {(data.restricted_time_windows || []).length === 0 ? (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            background: 'var(--bg-secondary)', borderRadius: 12,
            color: 'var(--text-tertiary)', fontSize: 13,
          }}>
            {t('adminSettings.noWindows')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data.restricted_time_windows || []).map((w) => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 14, background: 'var(--bg-secondary)',
                borderRadius: 12, flexWrap: 'wrap',
                opacity: w.is_active ? 1 : 0.55,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <EnvironmentOutlined style={{ color: 'var(--accent)', fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {w.location_keyword}
                    {!w.is_active && (
                      <span style={{
                        marginLeft: 8, fontSize: 11, fontWeight: 600,
                        color: 'var(--text-tertiary)',
                      }}>
                        ({t('adminSettings.windowDisabled')})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {w.start_time?.slice(0, 5)} – {w.end_time?.slice(0, 5)}
                  </div>
                  {w.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {w.description}
                    </div>
                  )}
                </div>
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => openEditWindow(w)} style={{ borderRadius: 8 }} />
                  <Popconfirm
                    title={t('adminSettings.deleteWindowConfirm')}
                    onConfirm={() => deleteWindow(w.id)}
                    okText={t('common.yes')}
                    cancelText={t('common.no')}
                  >
                    <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom save button */}
      <div style={{ textAlign: 'right', paddingBottom: 40 }}>
        <Button
          type="primary" icon={<SaveOutlined />} onClick={handleSave}
          loading={saving} size="large"
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 12, height: 46, fontWeight: 700, fontSize: 15,
            paddingInline: 32,
          }}
        >
          {t('adminSettings.save')}
        </Button>
      </div>

      <RestrictedWindowModal
        open={windowModal.open}
        editing={windowModal.editing}
        onCancel={closeWindowModal}
        onSubmit={saveWindow}
      />
    </div>
  );
}


function RestrictedWindowModal({ open, editing, onCancel, onSubmit }) {
  const { t } = useLang();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          location_keyword: editing.location_keyword,
          start_time: editing.start_time ? dayjs(editing.start_time, 'HH:mm:ss') : null,
          end_time: editing.end_time ? dayjs(editing.end_time, 'HH:mm:ss') : null,
          description: editing.description || '',
          is_active: editing.is_active !== false,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ is_active: true });
      }
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onSubmit({
        location_keyword: values.location_keyword.trim(),
        start_time: values.start_time.format('HH:mm:00'),
        end_time: values.end_time.format('HH:mm:00'),
        description: values.description || '',
        is_active: !!values.is_active,
      });
    } catch (err) {
      // validation errors already shown by AntD
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open} onCancel={onCancel} onOk={handleOk}
      confirmLoading={submitting}
      title={editing ? t('adminSettings.editWindow') : t('adminSettings.newWindow')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Form.Item
          name="location_keyword"
          label={<span style={{ fontWeight: 600 }}>{t('adminSettings.locationKeyword')}</span>}
          rules={[{ required: true, message: t('adminSettings.keywordRequired') }]}
          extra={t('adminSettings.locationKeywordHint')}
        >
          <Input placeholder="Tbilisi" style={{ borderRadius: 10 }} />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item
            name="start_time"
            label={<span style={{ fontWeight: 600 }}>{t('adminSettings.startTime')}</span>}
            rules={[{ required: true, message: t('common.required') }]}
            style={{ flex: 1 }}
          >
            <TimePicker format="HH:mm" style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
          <Form.Item
            name="end_time"
            label={<span style={{ fontWeight: 600 }}>{t('adminSettings.endTime')}</span>}
            rules={[{ required: true, message: t('common.required') }]}
            style={{ flex: 1 }}
          >
            <TimePicker format="HH:mm" style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
        </div>
        <Form.Item
          name="description"
          label={<span style={{ fontWeight: 600 }}>{t('adminSettings.windowDescription')}</span>}
          extra={t('adminSettings.windowDescriptionHint')}
        >
          <Input.TextArea rows={2} style={{ borderRadius: 10 }} />
        </Form.Item>
        <Form.Item name="is_active" label={t('common.active')} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
