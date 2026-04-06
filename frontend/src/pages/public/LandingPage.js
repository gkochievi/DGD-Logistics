import React, { useEffect, useState } from 'react';
import { Typography, Button, Row, Col, Card, Steps, Space, Grid } from 'antd';
import {
  RocketOutlined, SafetyOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CarOutlined, ToolOutlined,
  BuildOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

const CATEGORY_ICONS = {
  'tow-truck-recovery-vehicle': <CarOutlined />,
  'tractor': <ToolOutlined />,
  'cement-mixer-concrete-mixer-truck': <BuildOutlined />,
  'bulldozer': <ThunderboltOutlined />,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t } = useLang();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/categories/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    }).catch(() => {});
  }, []);

  const isMobile = !screens.md;

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)',
        padding: isMobile ? '48px 16px' : '80px 48px',
        textAlign: 'center', color: '#fff',
      }}>
        <Title style={{ color: '#fff', fontSize: isMobile ? 28 : 44, marginBottom: 16 }}>
          {t('landing.heroTitle')}
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: isMobile ? 16 : 20, maxWidth: 600, margin: '0 auto 32px' }}>
          {t('landing.heroDesc')}
        </Paragraph>
        <Space size="middle" wrap style={isMobile ? { width: '100%', justifyContent: 'center' } : {}}>
          <Button type="primary" size="large" ghost onClick={() => navigate('/app')}
            style={{ borderColor: '#fff', color: '#fff', height: 52, fontSize: 16, paddingInline: isMobile ? 40 : 32, minWidth: isMobile ? 160 : 'auto' }}>
            {t('landing.openApp')}
          </Button>
          <Button size="large" onClick={() => navigate('/app/login')}
            style={{ height: 52, fontSize: 16, paddingInline: isMobile ? 40 : 32, minWidth: isMobile ? 160 : 'auto' }}>
            {t('auth.login')}
          </Button>
        </Space>
      </div>

      {/* How it works */}
      <div style={{ padding: isMobile ? '40px 16px' : '64px 48px', maxWidth: 900, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
          {t('landing.howItWorks')}
        </Title>
        <Steps
          direction={isMobile ? 'vertical' : 'horizontal'}
          current={-1}
          items={[
            { title: t('landing.step1Title'), description: t('landing.step1Desc') },
            { title: t('landing.step2Title'), description: t('landing.step2Desc') },
            { title: t('landing.step3Title'), description: t('landing.step3Desc') },
            { title: t('landing.step4Title'), description: t('landing.step4Desc') },
          ]}
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ padding: isMobile ? '40px 16px' : '64px 48px', background: '#f5f5f5' }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
            {t('landing.availableTypes')}
          </Title>
          <Row gutter={[16, 16]} justify="center" style={{ maxWidth: 1000, margin: '0 auto' }}>
            {categories.map((cat) => (
              <Col xs={24} sm={12} md={6} key={cat.id}>
                <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
                  <div style={{ fontSize: 36, color: '#1677ff', marginBottom: 12 }}>
                    {CATEGORY_ICONS[cat.slug] || <CarOutlined />}
                  </div>
                  <Text strong style={{ fontSize: 15 }}>{cat.name}</Text>
                  {cat.description && (
                    <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 8, marginBottom: 0 }}>
                      {cat.description}
                    </Paragraph>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Benefits */}
      <div style={{ padding: isMobile ? '40px 16px' : '64px 48px', maxWidth: 1000, margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
          {t('landing.whyChoose')}
        </Title>
        <Row gutter={[24, 24]}>
          {[
            { icon: <RocketOutlined />, title: t('landing.fastTitle'), desc: t('landing.fastDesc') },
            { icon: <SafetyOutlined />, title: t('landing.reliableTitle'), desc: t('landing.reliableDesc') },
            { icon: <ClockCircleOutlined />, title: t('landing.trackingTitle'), desc: t('landing.trackingDesc') },
            { icon: <CheckCircleOutlined />, title: t('landing.smartTitle'), desc: t('landing.smartDesc') },
          ].map((b, i) => (
            <Col xs={24} sm={12} key={i}>
              <Card style={{ height: '100%' }}>
                <div style={{ fontSize: 28, color: '#1677ff', marginBottom: 8 }}>{b.icon}</div>
                <Text strong style={{ fontSize: 16 }}>{b.title}</Text>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>{b.desc}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #0050b3 0%, #1677ff 100%)',
        padding: isMobile ? '40px 16px' : '64px 48px',
        textAlign: 'center',
      }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 16 }}>
          {t('landing.readyTitle')}
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 24 }}>
          {t('landing.readyDesc')}
        </Paragraph>
        <Button type="primary" size="large" ghost onClick={() => navigate('/app')}
          style={{ borderColor: '#fff', color: '#fff', height: 52, paddingInline: 40, fontSize: 16, minWidth: isMobile ? 200 : 'auto' }}>
          {t('landing.getStarted')}
        </Button>
      </div>
    </div>
  );
}
