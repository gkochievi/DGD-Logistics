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
          style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
        >
          <div style={{ padding: '16px', fontWeight: 700, fontSize: collapsed ? 12 : 16, color: '#1677ff', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {collapsed ? 'ST' : 'SpecialTransport'}
          </div>
          {siderContent}
        </Sider>
      )}

      <Layout>
        <Header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: '#fff', borderBottom: '1px solid #f0f0f0',
          height: 56,
          paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1677ff' }}>SpecialTransport</span>
            )}
            {!isMobile && <span style={{ fontWeight: 600 }}>Dashboard</span>}
          </div>
          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              {!isMobile && <span>{user?.first_name}</span>}
            </div>
          </Dropdown>
        </Header>

        <Content style={{
          padding: isMobile ? 12 : 24,
          background: '#f5f5f5',
          minHeight: isMobile ? 'calc(100vh - 56px - 56px)' : 'calc(100vh - 56px)',
          paddingBottom: isMobile ? 68 : 24,
        }}>
          <Outlet />
        </Content>

        {/* Mobile bottom tab navigation */}
        {isMobile && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: 56,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            zIndex: 100,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
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
                    color: isActive ? '#1677ff' : '#999',
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
      </Layout>
    </Layout>
  );
}
