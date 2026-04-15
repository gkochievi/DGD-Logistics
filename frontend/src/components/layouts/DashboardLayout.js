import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Grid } from 'antd';
import {
  DashboardOutlined, PlusCircleOutlined,
  FileTextOutlined, UserOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const MENU_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/dashboard/orders/new', icon: <PlusCircleOutlined />, label: 'New Order' },
  { key: '/dashboard/orders', icon: <FileTextOutlined />, label: 'My Orders' },
  { key: '/dashboard/profile', icon: <UserOutlined />, label: 'Profile' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(true);

  const isMobile = !screens.md;

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/dashboard/profile') },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: () => { logout(); navigate('/'); } },
    ],
  };

  const selectedKey = MENU_ITEMS.find((item) =>
    location.pathname === item.key || (item.key !== '/dashboard' && location.pathname.startsWith(item.key))
  )?.key || '/dashboard';

  const siderContent = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={MENU_ITEMS}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          style={{
            background: 'var(--bg-primary)',
            borderRight: '1px solid var(--border-color)',
          }}
        >
          <div style={{
            padding: '16px', fontWeight: 800, fontSize: collapsed ? 12 : 16,
            color: 'var(--accent)', textAlign: 'center', whiteSpace: 'nowrap',
            overflow: 'hidden', letterSpacing: -0.3,
          }}>
            {collapsed ? 'HW' : 'Heawy Way'}
          </div>
          {siderContent}
        </Sider>
      )}

      <Layout>
        <Header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          height: 60,
          paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)', letterSpacing: -0.3 }}>
                SpecialTransport
              </span>
            )}
            {!isMobile && <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dashboard</span>}
          </div>
          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <Avatar size={32} style={{ background: 'var(--fab-gradient)', fontWeight: 600, fontSize: 13 }}>
                {(user?.first_name?.[0] || '?').toUpperCase()}
              </Avatar>
              {!isMobile && <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{user?.first_name}</span>}
            </div>
          </Dropdown>
        </Header>

        <Content style={{
          padding: isMobile ? 16 : 28,
          background: 'var(--bg-secondary)',
          minHeight: isMobile ? 'calc(100vh - 60px - 60px)' : 'calc(100vh - 60px)',
          paddingBottom: isMobile ? 80 : 28,
        }}>
          <Outlet />
        </Content>

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
      </Layout>
    </Layout>
  );
}
