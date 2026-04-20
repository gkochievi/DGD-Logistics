import React, { useState } from 'react';
import { Dropdown, Avatar, Grid, Switch } from 'antd';
import {
  DashboardOutlined, FileTextOutlined,
  TeamOutlined, AppstoreOutlined, UserOutlined, LogoutOutlined,
  CarOutlined, MoonFilled, SunFilled, BarChartOutlined,
  GlobalOutlined, DesktopOutlined, ExportOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { useBranding } from '../../contexts/BrandingContext';

const { useBreakpoint } = Grid;

export default function AdminLayout() {
  const branding = useBranding();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, lang, changeLang, SUPPORTED_LANGS, LANG_LABELS, LANG_FLAGS } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();

  const isMobile = !screens.md;

  const MENU_ITEMS = [
    { key: '/admin', icon: <DashboardOutlined />, label: t('nav.overview') },
    { key: '/admin/orders', icon: <FileTextOutlined />, label: t('nav.orders') },
    { key: '/admin/analytics', icon: <BarChartOutlined />, label: t('nav.analytics') },
    { key: '/admin/vehicles', icon: <CarOutlined />, label: t('nav.vehicles') },
    { key: '/admin/users', icon: <TeamOutlined />, label: t('nav.users') },
    { key: '/admin/categories', icon: <AppstoreOutlined />, label: t('nav.categories') },
    { key: '/admin/landing', icon: <DesktopOutlined />, label: t('nav.landing') },
  ];

  const selectedKey = MENU_ITEMS.find((item) =>
    location.pathname === item.key || (item.key !== '/admin' && location.pathname.startsWith(item.key))
  )?.key || '/admin';

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const userMenuItems = [
    {
      key: 'lang',
      icon: <GlobalOutlined />,
      label: t('profile.language'),
      children: SUPPORTED_LANGS.map((code) => ({
        key: `lang-${code}`,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{LANG_FLAGS[code]}</span>
            <span>{LANG_LABELS[code]}</span>
            {lang === code && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
          </span>
        ),
        onClick: () => changeLang(code),
      })),
    },
    {
      key: 'theme',
      icon: isDark ? <SunFilled /> : <MoonFilled />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 140 }}>
          {isDark ? t('theme.lightMode') : t('theme.darkMode')}
          <Switch
            size="small"
            checked={isDark}
            checkedChildren={<MoonFilled />}
            unCheckedChildren={<SunFilled />}
          />
        </span>
      ),
      onClick: () => { toggleTheme(); },
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: t('auth.logout'), danger: true, onClick: () => { logout(); navigate('/'); } },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Top navigation bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 60,
          maxWidth: 1400,
          margin: '0 auto',
        }}>
          {/* Logo */}
          <div
            onClick={() => navigate('/admin')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {branding.siteIconUrl ? (
              <img src={branding.siteIconUrl} alt="Logo" style={{
                width: 34, height: 34, borderRadius: 10, objectFit: 'contain',
              }} />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'var(--fab-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 800,
              }}>
                HW
              </div>
            )}
            {!isMobile && (
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', letterSpacing: -0.3 }}>
                {branding.siteName || t('common.admin')}
              </span>
            )}
          </div>

          {/* Desktop horizontal nav */}
          {!isMobile && (
            <nav style={{
              display: 'flex', alignItems: 'center', gap: 2,
              marginLeft: 36,
              flex: 1,
            }}>
              {MENU_ITEMS.map((item) => {
                const isActive = selectedKey === item.key;
                return (
                  <div
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 450,
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.75 }}>{item.icon}</span>
                    {item.label}
                  </div>
                );
              })}
            </nav>
          )}

          {/* Right: go to website + user dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => window.open('/', '_blank')}
            title={t('adminLanding.goToWebsite')}
            style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              color: 'var(--text-secondary)', fontSize: 16,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <ExportOutlined />
          </div>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: ({ key }) => {
                if (key !== 'theme' && !key.startsWith('lang')) setDropdownOpen(false);
              },
            }}
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            placement="bottomRight"
            trigger={['click']}
          >
            <div style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 10,
              transition: 'background 0.15s',
              background: dropdownOpen ? 'var(--surface-hover)' : 'transparent',
            }}>
              <Avatar size={32} style={{
                background: 'var(--fab-gradient)',
                fontSize: 13, fontWeight: 600,
              }}>
                {(user?.first_name?.[0] || '?').toUpperCase()}
              </Avatar>
              {!isMobile && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {user?.first_name}
                </span>
              )}
            </div>
          </Dropdown>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: isMobile ? 16 : 28,
        minHeight: isMobile ? 'calc(100vh - 60px - 60px)' : 'calc(100vh - 60px)',
        paddingBottom: isMobile ? 80 : 28,
      }}>
        <Outlet />
      </div>

      {/* Mobile bottom tab navigation */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'var(--tab-bar-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid var(--tab-bar-border)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: 60,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 100,
          boxShadow: 'var(--tab-bar-shadow)',
        }}>
          {MENU_ITEMS.map((item) => {
            const isActive = selectedKey === item.key;
            return (
              <div
                key={item.key}
                onClick={() => navigate(item.key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  padding: '8px 0',
                  cursor: 'pointer',
                  color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                  fontSize: 19,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'color 0.2s ease',
                }}
              >
                {item.icon}
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
