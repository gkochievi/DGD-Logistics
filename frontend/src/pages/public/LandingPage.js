import React, { useEffect, useState } from 'react';
import { Button, Row, Col, Grid } from 'antd';
import {
  EnvironmentOutlined, CarOutlined, ToolOutlined,
  BuildOutlined, ThunderboltOutlined,
  RocketOutlined, SafetyOutlined, ClockCircleOutlined,
  ArrowRightOutlined, FileTextOutlined, SearchOutlined,
  DollarOutlined, AimOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';

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
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [pickupCountryCode, setPickupCountryCode] = useState(null);

  useEffect(() => {
    api.get('/categories/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    }).catch(() => {});
  }, []);

  const isMobile = !screens.md;

  const handleGetOffers = () => {
    const locationState = {
      pickup: pickupLocation ? { ...pickupLocation, text: pickup } : pickup ? { text: pickup } : null,
      destination: destinationLocation ? { ...destinationLocation, text: destination } : destination ? { text: destination } : null,
    };
    if (user) {
      navigate('/app/order/new', { state: locationState });
    } else {
      navigate('/register', { state: locationState });
    }
  };

  const handleCategoryClick = (cat) => {
    if (user) {
      navigate(`/app/order/new?category=${cat.id}`);
    } else {
      navigate('/register');
    }
  };

  return (
    <div>
      {/* ── Scoped styles ── */}
      <style>{`
        .lt-hero-form .ant-input,
        .lt-hero-form .ant-input-affix-wrapper {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        .lt-hero-form .ant-input:focus,
        .lt-hero-form .ant-input-affix-wrapper:focus,
        .lt-hero-form .ant-input-affix-wrapper-focused {
          box-shadow: none !important;
        }
        .lt-cat-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
          height: 100%;
        }
        .lt-cat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--card-hover-shadow);
          border-color: var(--accent);
        }
        .lt-cat-card:hover .lt-cat-icon {
          transform: scale(1.1);
        }
        .lt-step-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          height: 100%;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .lt-step-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--card-hover-shadow);
          border-color: var(--accent);
        }
        .lt-benefit-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 28px 24px;
          height: 100%;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .lt-benefit-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--card-hover-shadow);
        }
        .lt-cta-btn {
          background: #fff !important;
          border: 2px solid #fff !important;
          color: var(--accent-dark, #008F44) !important;
          font-weight: 700 !important;
          transition: all 0.25s cubic-bezier(0.22,1,0.36,1) !important;
        }
        .lt-cta-btn:hover {
          background: rgba(255,255,255,0.9) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
      `}</style>

      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section style={{
        background: 'var(--bg-primary)',
        padding: isMobile ? '40px 20px 48px' : '72px 48px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle radial accent glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 50% 0%, var(--accent-bg) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 880, margin: '0 auto', textAlign: 'center',
          animation: 'fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1)',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: 100,
            background: 'var(--accent-bg)',
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: '0.02em',
          }}>
            Heawy Way
          </div>

          <h1 style={{
            fontSize: isMobile ? 30 : 52,
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 16px',
          }}>
            {t('landing.heroTitle')}
          </h1>

          <p style={{
            fontSize: isMobile ? 16 : 19,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 580,
            margin: '0 auto 36px',
          }}>
            {t('landing.heroDesc')}
          </p>

          {/* ── Search Form Bar ── */}
          <div className="lt-hero-form" style={{
            background: 'var(--card-bg)',
            borderRadius: isMobile ? 16 : 60,
            padding: isMobile ? 16 : '6px 6px 6px 24px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 12 : 0,
            alignItems: isMobile ? 'stretch' : 'center',
            maxWidth: 720,
            margin: '0 auto',
          }}>
            <LocationAutocomplete
              prefix={<EnvironmentOutlined style={{ color: 'var(--accent)', fontSize: 16 }} />}
              placeholder={t('landing.pickupPlaceholder')}
              value={pickup}
              onChange={setPickup}
              onSelect={(loc) => {
                setPickupLocation(loc);
                setPickupCountryCode(loc.countryCode || null);
              }}
            />
            {!isMobile && (
              <div style={{
                width: 1, height: 28,
                background: 'var(--border-color)', flexShrink: 0,
              }} />
            )}
            <LocationAutocomplete
              prefix={<AimOutlined style={{ color: '#10b981', fontSize: 16 }} />}
              placeholder={t('landing.destinationPlaceholder')}
              value={destination}
              onChange={setDestination}
              onSelect={(loc) => setDestinationLocation(loc)}
              countryCode={pickupCountryCode}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleGetOffers}
              style={{
                height: 48,
                paddingInline: isMobile ? 24 : 28,
                borderRadius: isMobile ? 12 : 40,
                fontWeight: 700,
                fontSize: 15,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {t('landing.getOffers')} <ArrowRightOutlined />
            </Button>
          </div>

          {/* ── Trust Stats ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? 24 : 48,
            marginTop: 36,
            flexWrap: 'wrap',
          }}>
            {[
              { num: '500+', label: t('landing.statsOrders') },
              { num: '50+', label: t('landing.statsVehicles') },
              { num: '98%', label: t('landing.statsRating') },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 24, fontWeight: 800,
                  color: 'var(--accent)', letterSpacing: '-0.02em',
                }}>
                  {s.num}
                </div>
                <div style={{
                  fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TRANSPORT CATEGORIES
      ══════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section style={{
          padding: isMobile ? '48px 20px' : '72px 48px',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 48 }}>
              <p style={{
                fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12,
              }}>
                {t('landing.vehicleTypes')}
              </p>
              <h2 style={{
                fontSize: isMobile ? 26 : 36, fontWeight: 800,
                color: 'var(--text-primary)', letterSpacing: '-0.03em',
                lineHeight: 1.2, margin: 0,
              }}>
                {t('landing.availableTypes')}
              </h2>
            </div>

            <Row gutter={[16, 16]} justify="center">
              {categories.map((cat, i) => (
                <Col xs={12} sm={8} md={6} key={cat.id}>
                  <div
                    className="lt-cat-card"
                    onClick={() => handleCategoryClick(cat)}
                    style={{
                      animation: `fadeInUp ${0.3 + i * 0.08}s cubic-bezier(0.22,1,0.36,1)`,
                    }}
                  >
                    <div
                      className="lt-cat-icon"
                      style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'var(--accent-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px',
                        fontSize: 26, color: 'var(--accent)',
                        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
                      }}
                    >
                      {CATEGORY_ICONS[cat.slug] || <CarOutlined />}
                    </div>
                    <h4 style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                      letterSpacing: '-0.01em', margin: '0 0 4px',
                    }}>
                      {cat.name}
                    </h4>
                    {cat.description && (
                      <p style={{
                        fontSize: 13, color: 'var(--text-secondary)',
                        lineHeight: 1.5, margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {cat.description}
                      </p>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          HOW IT WORKS (3 steps)
      ══════════════════════════════════════════ */}
      <section style={{
        padding: isMobile ? '56px 20px' : '88px 48px',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 56 }}>
            <p style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12,
            }}>
              {t('landing.howItWorks')}
            </p>
            <h2 style={{
              fontSize: isMobile ? 26 : 36, fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.03em',
              lineHeight: 1.2, margin: 0,
            }}>
              {t('landing.howItWorks')}
            </h2>
          </div>

          <Row gutter={[24, 24]}>
            {[
              {
                icon: <FileTextOutlined style={{ fontSize: 28 }} />,
                title: t('landing.step1Title'),
                desc: t('landing.step1Desc'),
                num: '01',
              },
              {
                icon: <SearchOutlined style={{ fontSize: 28 }} />,
                title: t('landing.step2Title'),
                desc: t('landing.step2Desc'),
                num: '02',
              },
              {
                icon: <CarOutlined style={{ fontSize: 28 }} />,
                title: t('landing.step3Title'),
                desc: t('landing.step3Desc'),
                num: '03',
              },
            ].map((step, i) => (
              <Col xs={24} md={8} key={i}>
                <div
                  className="lt-step-card"
                  style={{
                    animation: `fadeInUp ${0.4 + i * 0.12}s cubic-bezier(0.22,1,0.36,1)`,
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'var(--accent-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', color: 'var(--accent)',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
                  }}>
                    {step.num}
                  </div>
                  <h4 style={{
                    fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                    letterSpacing: '-0.02em', margin: '0 0 8px',
                  }}>
                    {step.title}
                  </h4>
                  <p style={{
                    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0,
                  }}>
                    {step.desc}
                  </p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHY CHOOSE US (Benefits)
      ══════════════════════════════════════════ */}
      <section style={{
        padding: isMobile ? '56px 20px' : '88px 48px',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 36 : 56 }}>
            <p style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12,
            }}>
              {t('landing.whyChoose')}
            </p>
            <h2 style={{
              fontSize: isMobile ? 26 : 36, fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.03em',
              lineHeight: 1.2, margin: 0,
            }}>
              {t('landing.whyChoose')}
            </h2>
          </div>

          <Row gutter={[20, 20]}>
            {[
              {
                icon: <RocketOutlined style={{ fontSize: 22 }} />,
                title: t('landing.fastTitle'),
                desc: t('landing.fastDesc'),
                color: '#00B856',
                bg: 'rgba(0,184,86,0.1)',
              },
              {
                icon: <SafetyOutlined style={{ fontSize: 22 }} />,
                title: t('landing.reliableTitle'),
                desc: t('landing.reliableDesc'),
                color: '#10b981',
                bg: 'rgba(16,185,129,0.1)',
              },
              {
                icon: <ClockCircleOutlined style={{ fontSize: 22 }} />,
                title: t('landing.trackingTitle'),
                desc: t('landing.trackingDesc'),
                color: '#f59e0b',
                bg: 'rgba(245,158,11,0.1)',
              },
              {
                icon: <DollarOutlined style={{ fontSize: 22 }} />,
                title: t('landing.smartTitle'),
                desc: t('landing.smartDesc'),
                color: '#3b82f6',
                bg: 'rgba(59,130,246,0.1)',
              },
            ].map((b, i) => (
              <Col xs={24} sm={12} key={i}>
                <div
                  className="lt-benefit-card"
                  style={{
                    display: 'flex', gap: 18, alignItems: 'flex-start',
                    animation: `fadeInUp ${0.4 + i * 0.1}s cubic-bezier(0.22,1,0.36,1)`,
                  }}
                >
                  <div style={{
                    width: 48, height: 48, minWidth: 48, borderRadius: 14,
                    background: b.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: b.color,
                  }}>
                    {b.icon}
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
                      letterSpacing: '-0.02em', margin: '0 0 6px',
                    }}>
                      {b.title}
                    </h4>
                    <p style={{
                      fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0,
                    }}>
                      {b.desc}
                    </p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════════ */}
      <section style={{
        background: 'var(--header-gradient)',
        padding: isMobile ? '64px 20px' : '88px 48px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: '-30%', left: '-10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', filter: 'blur(50px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-5%',
          width: 250, height: 250, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 600, margin: '0 auto',
        }}>
          <h2 style={{
            color: '#fff',
            fontSize: isMobile ? 26 : 36,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            margin: '0 0 14px',
          }}>
            {t('landing.readyTitle')}
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: isMobile ? 15 : 18,
            lineHeight: 1.6,
            margin: '0 0 36px',
          }}>
            {t('landing.readyDesc')}
          </p>
          <Button
            size="large"
            className="lt-cta-btn"
            onClick={() => navigate(user ? '/app/order/new' : '/register')}
            style={{
              height: 52,
              paddingInline: 40,
              fontSize: 16,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {t('landing.getStarted')} <ArrowRightOutlined />
          </Button>
        </div>
      </section>
    </div>
  );
}
