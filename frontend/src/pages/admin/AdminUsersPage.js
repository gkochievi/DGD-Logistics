import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Input, Select, Typography, Space, Grid, List, Tag, message,
} from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, UserOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const fetchUsers = (page = 1) => {
    setLoading(true);
    const params = { page };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (activeFilter) params.is_active = activeFilter;

    api.get('/auth/admin/users/', { params }).then(({ data }) => {
      const results = data.results || data;
      setUsers(Array.isArray(results) ? results : []);
      setPagination((p) => ({ ...p, current: page, total: data.count || results.length }));
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, activeFilter]); // eslint-disable-line

  const toggleActive = async (user) => {
    try {
      await api.patch(`/auth/admin/users/${user.id}/`, { is_active: !user.is_active });
      message.success(user.is_active ? t('adminUsers.userDeactivated') : t('adminUsers.userActivated'));
      fetchUsers(pagination.current);
    } catch {
      message.error(t('adminUsers.failedUpdateUser'));
    }
  };

  const isMobile = !screens.md;

  const columns = [
    { title: t('adminUsers.name'), dataIndex: 'full_name', ellipsis: true },
    { title: t('adminUsers.email'), dataIndex: 'email', ellipsis: true },
    { title: t('adminUsers.phone'), dataIndex: 'phone_number', width: 130 },
    {
      title: t('adminUsers.role'), dataIndex: 'role', width: 90,
      render: (role) => <Tag color={role === 'admin' ? 'purple' : 'blue'}>{role}</Tag>,
    },
    {
      title: t('adminUsers.userType'), dataIndex: 'user_type', width: 100,
      render: (type) => (
        <Tag color={type === 'company' ? 'gold' : 'default'}>
          {type === 'company' ? t('adminUsers.company') : t('adminUsers.personal')}
        </Tag>
      ),
    },
    {
      title: t('adminOrders.status'), dataIndex: 'is_active', width: 80,
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? t('common.active') : t('common.inactive')}</Tag>,
    },
    { title: t('adminUsers.ordersCount'), dataIndex: 'order_count', width: 70 },
    {
      title: '', width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => navigate(`/admin/users/${record.id}`)} />
          <Button
            size="small" type="text"
            danger={record.is_active}
            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => toggleActive(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{t('adminUsers.userManagement')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/users/new')}>
          {t('adminUsers.newUser')}
        </Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder={t('common.search')} prefix={<SearchOutlined />} allowClear
            style={{ width: 200 }} value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchUsers()}
          />
          <Select placeholder={t('adminUsers.role')} allowClear style={{ width: 120 }}
            value={roleFilter || undefined} onChange={(v) => setRoleFilter(v || '')}
            options={[{ value: 'customer', label: t('adminUsers.customer') }, { value: 'admin', label: t('common.admin') }]} />
          <Select placeholder={t('adminOrders.status')} allowClear style={{ width: 120 }}
            value={activeFilter || undefined} onChange={(v) => setActiveFilter(v || '')}
            options={[{ value: 'true', label: t('common.active') }, { value: 'false', label: t('common.inactive') }]} />
        </Space>
      </Card>

      {isMobile ? (
        <>
          {loading && users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>{t('common.loading')}</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>{t('adminUsers.noUsers')}</div>
          ) : (
            <>
              {users.map((u) => (
                <Card key={u.id} size="small" style={{ marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{u.full_name}</strong>
                    <Tag color={u.is_active ? 'green' : 'red'}>{u.is_active ? t('common.active') : t('common.inactive')}</Tag>
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                    {u.email}
                    {u.user_type === 'company' && u.company_name && (
                      <span style={{ color: '#999' }}> · {u.company_name}</span>
                    )}
                    {u.company_id && <span style={{ color: '#999' }}> · {u.company_id}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    <Tag color={u.role === 'admin' ? 'purple' : 'blue'}>{u.role}</Tag>
                    <Tag color={u.user_type === 'company' ? 'gold' : 'default'}>
                      {u.user_type === 'company' ? t('adminUsers.company') : t('adminUsers.personal')}
                    </Tag>
                    {u.order_count != null && `${u.order_count} ${t('adminUsers.ordersCount').toLowerCase()}`}
                  </div>
                </Card>
              ))}
              {pagination.current * pagination.pageSize < pagination.total && (
                <Button block style={{ marginTop: 8, height: 44 }} loading={loading}
                  onClick={() => fetchUsers(pagination.current + 1)}>
                  {t('common.loadMore')}
                </Button>
              )}
            </>
          )}
        </>
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <Table columns={columns} dataSource={users} rowKey="id" loading={loading} size="middle"
            scroll={{ x: 700 }}
            pagination={{ ...pagination, onChange: fetchUsers, showSizeChanger: false }} />
        </Card>
      )}
    </div>
  );
}
