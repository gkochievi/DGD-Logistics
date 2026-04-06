import React from 'react';
import { Layout, Button, Space, Grid } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';

const { Header, Content, Footer } = Layout;
const { useBreakpoint } = Grid;

export default function PublicLayout() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <Header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)',
        position: 'sticky', top: 0, zIndex: 100,
        height: 56,
        paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
      }}>
        <Link to="/" style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#1677ff', textDecoration: 'none' }}>
          {t('common.appName')}
        </Link>
        <Space size={isMobile ? 'small' : 'middle'}>
          {user ? (
            <Button type="primary" onClick={() => navigate(user.role === 'admin' ? '/admin' : '/app')}>
              {t('nav.dashboard')}
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate('/login')}>{t('auth.login')}</Button>
              <Button type="primary" onClick={() => navigate('/register')}>{t('auth.register')}</Button>
            </>
          )}
        </Space>
      </Header>
      <Content>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: isMobile ? '16px' : '24px 50px', background: 'var(--bg-secondary)' }}>
        {t('footer.copyright')} &copy; {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}
