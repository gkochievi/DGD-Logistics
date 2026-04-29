import React, { useEffect, useState } from 'react';
import { Button, Row, Col, Grid, Modal, Empty, Spin } from 'antd';
import {
  EnvironmentOutlined,
  ArrowRightOutlined, AimOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { useLang } from '../../contexts/LanguageContext';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';
import { getCategoryIcon, CategoryImage } from '../../utils/categoryIcons';

const { useBreakpoint } = Grid;

export default function LandingPage() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { defaultSearchScope, defaultSearchCountries } = useBranding();
  const [categories, setCategories] = useState([]);
  const [carCategories, setCarCategories] = useState([]);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllCarCategories, setShowAllCarCategories] = useState(false);
  const [vehicleModalCat, setVehicleModalCat] = useState(null);
  const [vehicleModalList, setVehicleModalList] = useState([]);
  const [vehicleModalLoading, setVehicleModalLoading] = useState(false);
  const [landing, setLanding] = useState(null);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [pickupCountryCode, setPickupCountryCode] = useState(null);

  useEffect(() => {
    api.get('/services/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    }).catch(() => {});
    api.get('/categories/').then(({ data }) => {
      setCarCategories(Array.isArray(data) ? data : data.results || []);
    }).catch(() => {});
    api.get('/landing/').then(({ data }) => {
      setLanding(data);
    }).catch(() => {});
  }, []);

  const openVehicleModal = (cat) => {
    setVehicleModalCat(cat);
    setVehicleModalList([]);
    setVehicleModalLoading(true);
    api.get('/vehicles/', { params: { category: cat.id } })
      .then(({ data }) => {
        setVehicleModalList(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => setVehicleModalList([]))
      .finally(() => setVehicleModalLoading(false));
  };

  const closeVehicleModal = () => {
    setVehicleModalCat(null);
    setVehicleModalList([]);
  };

  const isMobile = !screens.md;

  // Helper: get i18n text from landing data, fallback to translation key
  const lt = (field, fallbackKey) => {
    if (landing && landing[field]) {
      const val = landing[field];
      if (typeof val === 'string') return val;
      if (typeof val === 'object') return val[lang] || val['en'] || '';
    }
    return fallbackKey ? t(fallbackKey) : '';
  };

  // Derive country code filter from global site settings.
  const getSearchCountryCode = () => {
    const scope = defaultSearchScope || 'georgia';
    if (scope === 'georgia') return 'ge';
    if (scope === 'worldwide') return null;
    if (scope === 'custom') {
      const countries = defaultSearchCountries || [];
      return countries.length ? countries.join(',') : null;
    }
    return 'ge';
  };

  const searchCountryCode = getSearchCountryCode();

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
    const target = `/app/order/new?service=${cat.id}`;
    if (user) {
      navigate(target);
    } else {
      // Send the user to login; LoginPage honors state.redirectTo after
      // successful login so they land back on the order flow with the
      // chosen service pre-selected.
      navigate('/login', { state: { redirectTo: target } });
    }
  };

  // Build stats from API or fallback
  const stats = (landing?.stats && landing.stats.length > 0)
    ? landing.stats.map((s) => ({
        num: s.number,
        label: (typeof s.label === 'object') ? (s.label[lang] || s.label['en'] || '') : (s.label || ''),
      }))
    : [
        { num: '500+', label: t('landing.statsOrders') },
        { num: '50+', label: t('landing.statsVehicles') },
        { num: '98%', label: t('landing.statsRating') },
      ];

  // Build steps from API or fallback
  const steps = (landing?.steps && landing.steps.length > 0)
    ? landing.steps.map((s, i) => ({
        icon: getCategoryIcon(s.icon),
        title: (typeof s.title === 'object') ? (s.title[lang] || s.title['en'] || '') : (s.title || ''),
        desc: (typeof s.description === 'object') ? (s.description[lang] || s.description['en'] || '') : (s.description || ''),
        num: String(i + 1).padStart(2, '0'),
      }))
    : [
        { icon: getCategoryIcon('build'), title: t('landing.step1Title'), desc: t('landing.step1Desc'), num: '01' },
        { icon: getCategoryIcon('tool'), title: t('landing.step2Title'), desc: t('landing.step2Desc'), num: '02' },
        { icon: getCategoryIcon('car'), title: t('landing.step3Title'), desc: t('landing.step3Desc'), num: '03' },
      ];

  // Build benefits from API or fallback
  const benefits = (landing?.benefits && landing.benefits.length > 0)
    ? landing.benefits.map((b) => ({
        icon: getCategoryIcon(b.icon),
        title: (typeof b.title === 'object') ? (b.title[lang] || b.title['en'] || '') : (b.title || ''),
        desc: (typeof b.description === 'object') ? (b.description[lang] || b.description['en'] || '') : (b.description || ''),
        color: b.color || 'var(--accent)',
        bg: b.color ? `${b.color}1a` : 'var(--accent-bg-strong)',
      }))
    : [
        { icon: getCategoryIcon('rocket'), title: t('landing.fastTitle'), desc: t('landing.fastDesc'), color: '#00B856', bg: 'rgba(0,184,86,0.1)' },
        { icon: getCategoryIcon('build'), title: t('landing.reliableTitle'), desc: t('landing.reliableDesc'), color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { icon: getCategoryIcon('thunderbolt'), title: t('landing.trackingTitle'), desc: t('landing.trackingDesc'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { icon: getCategoryIcon('database'), title: t('landing.smartTitle'), desc: t('landing.smartDesc'), color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
      ];

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
          <h1 style={{
            fontSize: isMobile ? 30 : 52,
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 16px',
          }}>
            {lt('hero_title', 'landing.heroTitle')}
          </h1>

          <p style={{
            fontSize: isMobile ? 16 : 19,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 580,
            margin: '0 auto 36px',
          }}>
            {lt('hero_description', 'landing.heroDesc')}
          </p>

          {/* ── Search Form Bar ── */}
          <div className="lt-hero-form" style={{
            background: 'var(--card-bg)',
            borderRadius: isMobile ? 16 : 60,
            padding: isMobile ? 12 : '6px 6px 6px 24px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 10 : 0,
            alignItems: isMobile ? 'stretch' : 'center',
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
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
              countryCode={searchCountryCode}
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
              countryCode={pickupCountryCode || searchCountryCode}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleGetOffers}
              block={isMobile}
              style={{
                height: isMobile ? 46 : 48,
                paddingInline: isMobile ? 20 : 28,
                borderRadius: isMobile ? 12 : 40,
                fontWeight: 700,
                fontSize: 15,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
            {stats.map((s, i) => (
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
              {(showAllServices ? categories : categories.slice(0, 8)).map((cat, i) => (
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
                        width: '100%', aspectRatio: '4 / 3',
                        borderRadius: 16,
                        background: cat.image_url
                          ? 'var(--bg-secondary)'
                          : 'var(--accent-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 14,
                        color: 'var(--accent)', overflow: 'hidden',
                        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
                      }}
                    >
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" style={{
                          maxWidth: '100%', maxHeight: '100%',
                          width: 'auto', height: 'auto', objectFit: 'contain',
                          display: 'block',
                        }} />
                      ) : (
                        <CategoryImage icon={cat.icon} size={56} />
                      )}
                    </div>
                    <h4 style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                      letterSpacing: '-0.01em', margin: '0 0 4px',
                    }}>
                      {typeof cat.name === 'object' ? (cat.name[lang] || cat.name.en || '') : cat.name}
                    </h4>
                    {cat.description && (typeof cat.description === 'object' ? (cat.description[lang] || cat.description.en) : cat.description) && (
                      <p style={{
                        fontSize: 13, color: 'var(--text-secondary)',
                        lineHeight: 1.5, margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {typeof cat.description === 'object' ? (cat.description[lang] || cat.description.en || '') : cat.description}
                      </p>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
            {categories.length > 8 && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button
                  type="default"
                  onClick={() => setShowAllServices((v) => !v)}
                  style={{
                    height: 42, padding: '0 22px', borderRadius: 12,
                    fontWeight: 600, fontSize: 14,
                    background: 'var(--card-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {showAllServices
                    ? t('landing.showLess')
                    : t('landing.showMore', { count: categories.length - 8 })}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          CAR CATEGORIES (Our Fleet)
          Clicking a tile opens a modal with the vehicles in that category.
      ══════════════════════════════════════════ */}
      {carCategories.length > 0 && (
        <section style={{
          padding: isMobile ? '48px 20px' : '72px 48px',
          background: 'var(--bg-primary)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 48 }}>
              <p style={{
                fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12,
              }}>
                {t('landing.ourFleet')}
              </p>
              <h2 style={{
                fontSize: isMobile ? 26 : 36, fontWeight: 800,
                color: 'var(--text-primary)', letterSpacing: '-0.03em',
                lineHeight: 1.2, margin: 0,
              }}>
                {t('landing.browseByCategory')}
              </h2>
            </div>

            <Row gutter={[16, 16]} justify="center">
              {(showAllCarCategories ? carCategories : carCategories.slice(0, 8)).map((cat, i) => (
                <Col xs={12} sm={8} md={6} key={cat.id}>
                  <div
                    className="lt-cat-card"
                    onClick={() => openVehicleModal(cat)}
                    style={{
                      animation: `fadeInUp ${0.3 + i * 0.08}s cubic-bezier(0.22,1,0.36,1)`,
                    }}
                  >
                    <div
                      className="lt-cat-icon"
                      style={{
                        width: '100%', aspectRatio: '4 / 3',
                        borderRadius: 16,
                        background: cat.image_url
                          ? 'var(--bg-secondary)'
                          : 'var(--accent-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 14,
                        color: 'var(--accent)', overflow: 'hidden',
                        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
                      }}
                    >
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" style={{
                          maxWidth: '100%', maxHeight: '100%',
                          width: 'auto', height: 'auto', objectFit: 'contain',
                          display: 'block',
                        }} />
                      ) : (
                        <CategoryImage icon={cat.icon} size={56} />
                      )}
                    </div>
                    <h4 style={{
                      fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                      letterSpacing: '-0.01em', margin: '0 0 4px',
                    }}>
                      {typeof cat.name === 'object' ? (cat.name[lang] || cat.name.en || '') : cat.name}
                    </h4>
                    {cat.description && (typeof cat.description === 'object' ? (cat.description[lang] || cat.description.en) : cat.description) && (
                      <p style={{
                        fontSize: 13, color: 'var(--text-secondary)',
                        lineHeight: 1.5, margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {typeof cat.description === 'object' ? (cat.description[lang] || cat.description.en || '') : cat.description}
                      </p>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
            {carCategories.length > 8 && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button
                  type="default"
                  onClick={() => setShowAllCarCategories((v) => !v)}
                  style={{
                    height: 42, padding: '0 22px', borderRadius: 12,
                    fontWeight: 600, fontSize: 14,
                    background: 'var(--card-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {showAllCarCategories
                    ? t('landing.showLess')
                    : t('landing.showMore', { count: carCategories.length - 8 })}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Vehicles-in-category modal (public, read-only view) */}
      <Modal
        open={!!vehicleModalCat}
        onCancel={closeVehicleModal}
        footer={null}
        width={isMobile ? '94vw' : 820}
        closeIcon={<CloseOutlined />}
        title={
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
            {vehicleModalCat
              ? (typeof vehicleModalCat.name === 'object'
                  ? (vehicleModalCat.name[lang] || vehicleModalCat.name.en || '')
                  : vehicleModalCat.name)
              : ''}
          </span>
        }
        styles={{
          content: { borderRadius: 16, padding: 0 },
          header: { padding: isMobile ? '16px 18px 0' : '20px 24px 0', borderBottom: 'none' },
          body: { padding: isMobile ? '12px 18px 18px' : '16px 24px 24px' },
        }}
      >
        {vehicleModalLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : vehicleModalList.length === 0 ? (
          <Empty description={t('landing.noVehiclesInCategory')} />
        ) : (
          <Row gutter={[16, 16]}>
            {vehicleModalList.map((v) => {
              const photo = v.image
                || v.images?.find((i) => i.is_primary)?.image
                || v.images?.[0]?.image
                || null;
              return (
                <Col xs={24} sm={12} key={v.id}>
                  <div style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    height: '100%',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{
                      width: '100%', aspectRatio: '16 / 10',
                      background: 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {photo ? (
                        <img
                          src={photo}
                          alt={v.name}
                          style={{
                            maxWidth: '100%', maxHeight: '100%',
                            width: 'auto', height: 'auto',
                            objectFit: 'contain', display: 'block',
                          }}
                        />
                      ) : (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                          {t('landing.noPhoto')}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 14px', flex: 1 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 15,
                        color: 'var(--text-primary)', letterSpacing: '-0.01em',
                        marginBottom: 4,
                      }}>
                        {v.name}
                      </div>
                      {v.capacity && (
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {v.capacity}
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Modal>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      {steps.length > 0 && (
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
                {lt('steps_title', 'landing.howItWorks') || t('landing.howItWorks')}
              </p>
              <h2 style={{
                fontSize: isMobile ? 26 : 36, fontWeight: 800,
                color: 'var(--text-primary)', letterSpacing: '-0.03em',
                lineHeight: 1.2, margin: 0,
              }}>
                {lt('steps_title', 'landing.howItWorks') || t('landing.howItWorks')}
              </h2>
            </div>

            <Row gutter={[24, 24]}>
              {steps.map((step, i) => (
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
                      margin: '0 auto 20px', color: 'var(--accent)', fontSize: 28,
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
      )}

      {/* ══════════════════════════════════════════
          WHY CHOOSE US (Benefits)
      ══════════════════════════════════════════ */}
      {benefits.length > 0 && (
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
                {lt('benefits_title', 'landing.whyChoose') || t('landing.whyChoose')}
              </p>
              <h2 style={{
                fontSize: isMobile ? 26 : 36, fontWeight: 800,
                color: 'var(--text-primary)', letterSpacing: '-0.03em',
                lineHeight: 1.2, margin: 0,
              }}>
                {lt('benefits_title', 'landing.whyChoose') || t('landing.whyChoose')}
              </h2>
            </div>

            <Row gutter={[20, 20]}>
              {benefits.map((b, i) => (
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
                      color: b.color, fontSize: 22,
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
      )}

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
            {lt('cta_title', 'landing.readyTitle')}
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: isMobile ? 15 : 18,
            lineHeight: 1.6,
            margin: '0 0 36px',
          }}>
            {lt('cta_description', 'landing.readyDesc')}
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
            {lt('cta_button_text', 'landing.getStarted')} <ArrowRightOutlined />
          </Button>
        </div>
      </section>
    </div>
  );
}
