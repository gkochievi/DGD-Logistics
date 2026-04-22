import React, { useEffect, useState } from 'react';
import {
  Button, Typography, Form, Input, message, Grid, Upload,
  ColorPicker, Select, Tabs, Spin,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined,
  RocketOutlined, FileTextOutlined, TrophyOutlined,
  ThunderboltOutlined, StarOutlined, UploadOutlined,
} from '@ant-design/icons';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';
import { getCategoryIcon, AVAILABLE_ICONS } from '../../utils/categoryIcons';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const LANG_TABS = [
  { key: 'en', label: '🇬🇧 EN' },
  { key: 'ka', label: '🇬🇪 KA' },
  { key: 'ru', label: '🇷🇺 RU' },
];

export default function AdminLandingPage() {
  const screens = useBreakpoint();
  const { t } = useLang();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroImagePreview, setHeroImagePreview] = useState(null);

  useEffect(() => {
    api.get('/landing/admin/').then(({ data }) => {
      setData(data);
      if (data.hero_image_url) setHeroImagePreview(data.hero_image_url);
    }).catch(() => message.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateI18nField = (field, lang, value) => {
    setData((prev) => ({
      ...prev,
      [field]: { ...(prev[field] || {}), [lang]: value },
    }));
  };

  const updateArrayItem = (field, index, key, value) => {
    setData((prev) => {
      const arr = [...(prev[field] || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const updateArrayItemI18n = (field, index, key, lang, value) => {
    setData((prev) => {
      const arr = [...(prev[field] || [])];
      arr[index] = {
        ...arr[index],
        [key]: { ...(arr[index]?.[key] || {}), [lang]: value },
      };
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = (field, template) => {
    setData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), template],
    }));
  };

  const removeArrayItem = (field, index) => {
    setData((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();

      const jsonFields = [
        'hero_title', 'hero_description', 'stats',
        'steps_title', 'steps', 'benefits_title', 'benefits',
        'cta_title', 'cta_description', 'cta_button_text',
      ];

      jsonFields.forEach((field) => {
        formData.append(field, JSON.stringify(data[field] || {}));
      });

      if (heroImageFile) {
        formData.append('hero_image', heroImageFile);
      }

      await api.put('/landing/admin/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(t('adminLanding.saved'));
    } catch (err) {
      message.error(t('adminLanding.saveFailed'));
    } finally {
      setSaving(false);
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
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <Title level={3} style={{
            margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            {t('adminLanding.title')}
          </Title>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
            {t('adminLanding.subtitle')}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 10, height: 40, fontWeight: 600,
          }}
        >
          {t('adminLanding.save')}
        </Button>
      </div>

      {/* ── Hero Section ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <StarOutlined style={{ color: 'var(--accent)' }} />
          {t('adminLanding.heroSection')}
        </div>

        <Form layout="vertical" requiredMark={false}>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.heroTitle')}</span>}>
            <I18nInput
              value={data.hero_title}
              onChange={(lang, val) => updateI18nField('hero_title', lang, val)}
            />
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.heroDescription')}</span>}>
            <I18nTextArea
              value={data.hero_description}
              onChange={(lang, val) => updateI18nField('hero_description', lang, val)}
            />
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.heroImage')}</span>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {heroImagePreview && (
                <img
                  src={heroImagePreview}
                  alt="Hero"
                  style={{
                    width: 120, height: 80, objectFit: 'cover',
                    borderRadius: 10, border: '1px solid var(--border-color)',
                  }}
                />
              )}
              <Upload
                beforeUpload={(file) => {
                  setHeroImageFile(file);
                  setHeroImagePreview(URL.createObjectURL(file));
                  return false;
                }}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 10 }}>
                  {t('adminLanding.uploadImage')}
                </Button>
              </Upload>
              {heroImagePreview && (
                <Button
                  danger
                  type="text"
                  onClick={() => {
                    setHeroImageFile(null);
                    setHeroImagePreview(null);
                    updateField('hero_image', null);
                  }}
                >
                  {t('adminLanding.removeImage')}
                </Button>
              )}
            </div>
          </Form.Item>
        </Form>
      </div>

      {/* ── Stats Section ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <TrophyOutlined style={{ color: 'var(--accent)' }} />
          {t('adminLanding.statsSection')}
        </div>
        {(data.stats || []).map((stat, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start',
            padding: 12, background: 'var(--bg-secondary)', borderRadius: 12,
          }}>
            <div style={{ flex: '0 0 100px' }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {t('adminLanding.statNumber')}
              </Text>
              <Input
                value={stat.number}
                onChange={(e) => updateArrayItem('stats', i, 'number', e.target.value)}
                style={inputStyle}
                placeholder="500+"
              />
            </div>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {t('adminLanding.statLabel')}
              </Text>
              <I18nInput
                value={stat.label}
                onChange={(lang, val) => updateArrayItemI18n('stats', i, 'label', lang, val)}
              />
            </div>
            <Button
              type="text" danger
              icon={<DeleteOutlined />}
              onClick={() => removeArrayItem('stats', i)}
              style={{ marginTop: 18 }}
            />
          </div>
        ))}
        <Button
          type="dashed" block
          icon={<PlusOutlined />}
          onClick={() => addArrayItem('stats', { number: '', label: {} })}
          style={{ borderRadius: 10 }}
        >
          {t('adminLanding.addStat')}
        </Button>
      </div>

      {/* ── Steps Section ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <FileTextOutlined style={{ color: 'var(--accent)' }} />
          {t('adminLanding.stepsSection')}
        </div>

        <Form layout="vertical" requiredMark={false}>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.stepsTitle')}</span>}>
            <I18nInput
              value={data.steps_title}
              onChange={(lang, val) => updateI18nField('steps_title', lang, val)}
            />
          </Form.Item>
        </Form>

        {(data.steps || []).map((step, i) => (
          <div key={i} style={{
            padding: 16, background: 'var(--bg-secondary)', borderRadius: 12,
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 10,
            }}>
              <Text style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Step {i + 1}
              </Text>
              <Button
                type="text" danger size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeArrayItem('steps', i)}
              >
                {t('adminLanding.remove')}
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: isMobile ? '1 1 100%' : '0 0 150px' }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {t('adminLanding.stepIcon')}
                </Text>
                <Select
                  value={step.icon}
                  onChange={(val) => updateArrayItem('steps', i, 'icon', val)}
                  style={{ width: '100%' }}
                  options={AVAILABLE_ICONS.map((name) => ({
                    value: name,
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getCategoryIcon(name)} {name}
                      </span>
                    ),
                  }))}
                />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {t('adminLanding.stepTitle')}
              </Text>
              <I18nInput
                value={step.title}
                onChange={(lang, val) => updateArrayItemI18n('steps', i, 'title', lang, val)}
              />
            </div>
            <div>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {t('adminLanding.stepDescription')}
              </Text>
              <I18nTextArea
                value={step.description}
                onChange={(lang, val) => updateArrayItemI18n('steps', i, 'description', lang, val)}
                rows={2}
              />
            </div>
          </div>
        ))}
        <Button
          type="dashed" block
          icon={<PlusOutlined />}
          onClick={() => addArrayItem('steps', { icon: 'car', title: {}, description: {} })}
          style={{ borderRadius: 10 }}
        >
          {t('adminLanding.addStep')}
        </Button>
      </div>

      {/* ── Benefits Section ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <RocketOutlined style={{ color: 'var(--accent)' }} />
          {t('adminLanding.benefitsSection')}
        </div>

        <Form layout="vertical" requiredMark={false}>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.benefitsTitle')}</span>}>
            <I18nInput
              value={data.benefits_title}
              onChange={(lang, val) => updateI18nField('benefits_title', lang, val)}
            />
          </Form.Item>
        </Form>

        {(data.benefits || []).map((b, i) => (
          <div key={i} style={{
            padding: 16, background: 'var(--bg-secondary)', borderRadius: 12,
            marginBottom: 12,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 10,
            }}>
              <Text style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Benefit {i + 1}
              </Text>
              <Button
                type="text" danger size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeArrayItem('benefits', i)}
              >
                {t('adminLanding.remove')}
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: isMobile ? '1 1 100%' : '0 0 150px' }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {t('adminLanding.benefitIcon')}
                </Text>
                <Select
                  value={b.icon}
                  onChange={(val) => updateArrayItem('benefits', i, 'icon', val)}
                  style={{ width: '100%' }}
                  options={AVAILABLE_ICONS.map((name) => ({
                    value: name,
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getCategoryIcon(name)} {name}
                      </span>
                    ),
                  }))}
                />
              </div>
              <div>
                <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {t('adminLanding.benefitColor')}
                </Text>
                <div>
                  <ColorPicker
                    value={b.color || '#00B856'}
                    onChange={(c) => updateArrayItem('benefits', i, 'color', c.toHexString())}
                    format="hex"
                  />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {t('adminLanding.benefitTitle')}
              </Text>
              <I18nInput
                value={b.title}
                onChange={(lang, val) => updateArrayItemI18n('benefits', i, 'title', lang, val)}
              />
            </div>
            <div>
              <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {t('adminLanding.benefitDescription')}
              </Text>
              <I18nTextArea
                value={b.description}
                onChange={(lang, val) => updateArrayItemI18n('benefits', i, 'description', lang, val)}
                rows={2}
              />
            </div>
          </div>
        ))}
        <Button
          type="dashed" block
          icon={<PlusOutlined />}
          onClick={() => addArrayItem('benefits', { icon: 'rocket', title: {}, description: {}, color: '#00B856' })}
          style={{ borderRadius: 10 }}
        >
          {t('adminLanding.addBenefit')}
        </Button>
      </div>

      {/* ── CTA Section ── */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          <ThunderboltOutlined style={{ color: 'var(--accent)' }} />
          {t('adminLanding.ctaSection')}
        </div>

        <Form layout="vertical" requiredMark={false}>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.ctaTitle')}</span>}>
            <I18nInput
              value={data.cta_title}
              onChange={(lang, val) => updateI18nField('cta_title', lang, val)}
            />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.ctaDescription')}</span>}>
            <I18nTextArea
              value={data.cta_description}
              onChange={(lang, val) => updateI18nField('cta_description', lang, val)}
            />
          </Form.Item>
          <Form.Item label={<span style={{ fontWeight: 600 }}>{t('adminLanding.ctaButton')}</span>}>
            <I18nInput
              value={data.cta_button_text}
              onChange={(lang, val) => updateI18nField('cta_button_text', lang, val)}
            />
          </Form.Item>
        </Form>
      </div>

      {/* Bottom save button */}
      <div style={{ textAlign: 'right', paddingBottom: 40 }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          size="large"
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 12, height: 46, fontWeight: 700, fontSize: 15,
            paddingInline: 32,
          }}
        >
          {t('adminLanding.save')}
        </Button>
      </div>
    </div>
  );
}

/* ── I18n Input with language tabs ── */
function I18nInput({ value = {}, onChange }) {
  return (
    <Tabs
      size="small"
      items={LANG_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        children: (
          <Input
            value={value[tab.key] || ''}
            onChange={(e) => onChange(tab.key, e.target.value)}
            style={{ borderRadius: 10 }}
          />
        ),
      }))}
      style={{ marginTop: -8 }}
    />
  );
}

function I18nTextArea({ value = {}, onChange, rows = 3 }) {
  return (
    <Tabs
      size="small"
      items={LANG_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        children: (
          <TextArea
            value={value[tab.key] || ''}
            onChange={(e) => onChange(tab.key, e.target.value)}
            rows={rows}
            style={{ borderRadius: 10 }}
          />
        ),
      }))}
      style={{ marginTop: -8 }}
    />
  );
}
