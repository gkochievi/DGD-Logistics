import React from 'react';
import { Grid } from 'antd';
import {
  HomeOutlined, HomeFilled,
  FileTextOutlined, FileTextFilled,
  UserOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../../contexts/LanguageContext';

const { useBreakpoint } = Grid;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { t } = useLang();

  const TAB_ITEMS = [
    { key: '/app', icon: <HomeOutlined />, activeIcon: <HomeFilled />, label: t('nav.home') },
    { key: '/app/orders', icon: <FileTextOutlined />, activeIcon: <FileTextFilled />, label: t('nav.orders') },
    { key: '/app/profile', icon: <UserOutlined />, activeIcon: <UserOutlined />, label: t('nav.profile') },
  ];

  const activeTab = TAB_ITEMS.find((item) =>
    item.key !== '/app'
      ? location.pathname.startsWith(item.key)
      : location.pathname === '/app'
  )?.key || '/app';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: isMobile ? '100%' : 480,
      margin: '0 auto',
      position: 'relative',
      boxShadow: isMobile ? 'none' : 'var(--shadow-xl)',
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingBottom: 88,
        WebkitOverflowScrolling: 'touch',
      }}>
        <Outlet />
      </div>

      {/* Bottom tab bar with glassmorphism */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: isMobile ? 0 : '50%',
        right: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : 480,
        transform: isMobile ? 'none' : 'translateX(-50%)',
        background: 'var(--tab-bar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--tab-bar-border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
        boxShadow: 'var(--tab-bar-shadow)',
      }}>
        {/* Left tabs */}
        <TabItem
          item={TAB_ITEMS[0]}
          isActive={activeTab === TAB_ITEMS[0].key}
          onClick={() => navigate(TAB_ITEMS[0].key)}
        />
        <TabItem
          item={TAB_ITEMS[1]}
          isActive={activeTab === TAB_ITEMS[1].key}
          onClick={() => navigate(TAB_ITEMS[1].key)}
        />

        {/* Center FAB */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 0',
        }}>
          <div
            onClick={() => navigate('/app/order/new')}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: 'var(--fab-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
              boxShadow: 'var(--fab-shadow)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <PlusOutlined />
          </div>
        </div>

        {/* Right tab */}
        <TabItem
          item={TAB_ITEMS[2]}
          isActive={activeTab === TAB_ITEMS[2].key}
          onClick={() => navigate(TAB_ITEMS[2].key)}
        />

        {/* Empty spacer for balance */}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

function TabItem({ item, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '10px 0 8px',
        cursor: 'pointer',
        color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
        fontSize: 21,
        transition: 'color 0.2s ease',
        position: 'relative',
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 20,
          height: 3,
          borderRadius: '0 0 3px 3px',
          background: 'var(--accent)',
        }} />
      )}
      {isActive ? item.activeIcon : item.icon}
      <span style={{
        fontSize: 10,
        fontWeight: isActive ? 600 : 400,
        letterSpacing: 0.2,
      }}>
        {item.label}
      </span>
    </div>
  );
}
