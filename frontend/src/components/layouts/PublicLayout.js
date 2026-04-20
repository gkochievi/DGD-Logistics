import React, { useState } from 'react';
import { Layout, Button, Space, Grid, Dropdown, Switch } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ArrowRightOutlined, GlobalOutlined, MoonFilled, SunFilled } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { useBranding } from '../../contexts/BrandingContext';

const { Content, Footer } = Layout;
const { useBreakpoint } = Grid;

export default function PublicLayout() {
  const branding = useBranding();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, lang, changeLang, SUPPORTED_LANGS, LANG_LABELS, LANG_FLAGS } = useLang();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [langOpen, setLangOpen] = useState(false);

  const langMenuItems = SUPPORTED_LANGS.map((code) => ({
    key: code,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{LANG_FLAGS[code]}</span>
        <span>{LANG_LABELS[code]}</span>
        {lang === code && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
      </span>
    ),
    onClick: () => changeLang(code),
  }));

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Modern floating header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: isMobile ? '8px 12px' : '10px 24px',
        paddingTop: isMobile ? 'calc(8px + env(safe-area-inset-top, 0px))' : '10px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '10px 16px' : '12px 24px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 16,
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <Link to="/" style={{
            fontSize: isMobile ? 17 : 19, fontWeight: 800, color: 'var(--accent)',
            textDecoration: 'none', letterSpacing: -0.5,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {branding.siteIconUrl ? (
              <img src={branding.siteIconUrl} alt="Logo" style={{
                width: 32, height: 32, borderRadius: 10, objectFit: 'contain',
              }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'var(--fab-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 800,
              }}>
                HW
              </div>
            )}
            {!isMobile && (branding.siteName || t('common.appName'))}
          </Link>

          <Space size={isMobile ? 4 : 8}>
            {/* Language selector */}
            <Dropdown
              menu={{ items: langMenuItems }}
              open={langOpen}
              onOpenChange={setLangOpen}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                style={{
                  borderRadius: 10,
                  height: 36,
                  minWidth: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-hover)',
                }}
              >
                <span style={{ fontSize: 16 }}>{LANG_FLAGS[lang]}</span>
                {!isMobile && <span style={{ fontSize: 12, fontWeight: 500 }}>{lang.toUpperCase()}</span>}
              </Button>
            </Dropdown>

            {/* Dark/Light mode toggle */}
            <Button
              type="text"
              size="small"
              onClick={toggleTheme}
              style={{
                borderRadius: 10,
                height: 36,
                width: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-hover)',
                fontSize: 16,
              }}
            >
              {isDark ? <SunFilled /> : <MoonFilled />}
            </Button>

            {/* Auth buttons */}
            {user ? (
              <Button type="primary" onClick={() => navigate(user.role === 'admin' ? '/admin' : '/app')}
                icon={<ArrowRightOutlined />} iconPosition="end"
                style={{ borderRadius: 10, fontWeight: 600, height: 38 }}>
                {t('nav.dashboard')}
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate('/login')}
                  style={{ borderRadius: 10, fontWeight: 500, height: 38, border: 'none', background: 'var(--surface-hover)' }}>
                  {t('auth.login')}
                </Button>
                <Button type="primary" onClick={() => navigate('/register')}
                  style={{ borderRadius: 10, fontWeight: 600, height: 38 }}>
                  {t('auth.register')}
                </Button>
              </>
            )}
          </Space>
        </div>
      </div>

      <Content>
        <Outlet />
      </Content>

      <Footer style={{
        textAlign: 'center', color: 'var(--text-tertiary)',
        padding: isMobile ? '16px' : '24px 50px',
        background: 'transparent', fontSize: 13,
      }}>
        {t('footer.copyright')} &copy; {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}
