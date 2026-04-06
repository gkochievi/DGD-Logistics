import React, { useState } from 'react';
import { Dropdown, Avatar, Grid, Switch } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, HistoryOutlined,
  TeamOutlined, AppstoreOutlined, UserOutlined, LogoutOutlined,
  CarOutlined, MoonFilled, SunFilled, BarChartOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';

const { useBreakpoint } = Grid;

export default function AdminLayout() {
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
            {lang === code && <span style={{ marginLeft: 'auto', color: '#1677ff' }}>✓</span>}
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
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 56,
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
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #1677ff, #0050b3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 700,
            }}>
              ST
            </div>
            {!isMobile && (
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                {t('common.admin')}
              </span>
            )}
          </div>

          {/* Desktop horizontal nav */}
          {!isMobile && (
            <nav style={{
              display: 'flex', alignItems: 'center', gap: 2,
              marginLeft: 32,
              flex: 1,
            }}>
              {MENU_ITEMS.map((item) => {
                const isActive = selectedKey === item.key;
                return (
                  <div
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#1677ff' : 'var(--text-secondary)',
                      background: isActive ? 'var(--accent-bg)' : 'transparent',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{item.icon}</span>
                    {item.label}
                  </div>
                );
              })}
            </nav>
          )}

          {/* Right: user dropdown */}
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
              padding: '6px 10px', borderRadius: 8,
              transition: 'background 0.15s',
            }}>
              <Avatar size={30} style={{ backgroundColor: '#f56a00', fontSize: 13 }} icon={<UserOutlined />} />
              {!isMobile && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {user?.first_name}
                </span>
              )}
            </div>
          </Dropdown>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: isMobile ? 12 : 24,
        minHeight: isMobile ? 'calc(100vh - 56px - 56px)' : 'calc(100vh - 56px)',
        paddingBottom: isMobile ? 72 : 24,
      }}>
        <Outlet />
      </div>

      {/* Mobile bottom tab navigation */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'var(--tab-bar-bg)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: 56,
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
                  gap: 2,
                  padding: '6px 0',
                  cursor: 'pointer',
                  color: isActive ? '#1677ff' : 'var(--text-tertiary)',
                  fontSize: 20,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'color 0.2s',
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
