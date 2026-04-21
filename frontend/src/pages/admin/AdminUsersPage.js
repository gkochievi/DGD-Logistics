import React, { useEffect, useState } from 'react';
import {
  Table, Button, Input, Select, Typography, Space, Grid, Tag, message, Empty, Switch,
} from 'antd';
import {
  PlusOutlined, EditOutlined, SearchOutlined, StopOutlined,
  CheckCircleOutlined, FilterOutlined, RightOutlined, ShoppingOutlined,
} from '@ant-design/icons';
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
  const [showArchived, setShowArchived] = useState(false);

  const fetchUsers = (page = 1) => {
    setLoading(true);
    const params = { page };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    params.is_active = showArchived ? 'false' : 'true';

    api.get('/auth/admin/users/', { params }).then(({ data }) => {
      const results = data.results || data;
      setUsers(Array.isArray(results) ? results : []);
      setPagination((p) => ({ ...p, current: page, total: data.count || results.length }));
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, showArchived]); // eslint-disable-line

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
    {
      title: t('adminUsers.name'), dataIndex: 'full_name', ellipsis: true,
      render: (name) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
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
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? t('common.active') : t('common.inactive')}
        </Tag>
      ),
    },
    {
      title: t('adminUsers.ordersCount'), dataIndex: 'order_count', width: 80,
      render: (count, record) => record.role === 'customer' && count > 0 ? (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontWeight: 600 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/orders?user_id=${record.id}&user_name=${encodeURIComponent(record.full_name)}`);
          }}
        >
          {count}
        </Button>
      ) : count,
    },
    {
      title: '', width: 120,
      render: (_, record) => (
        <Space size={4}>
          {record.role === 'customer' && (
            <Button
              size="small"
              type="text"
              icon={<ShoppingOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/orders?user_id=${record.id}&user_name=${encodeURIComponent(record.full_name)}`);
              }}
              title={t('adminUsers.viewOrders')}
              style={{ color: 'var(--text-secondary)' }}
            />
          )}
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${record.id}`); }}
            style={{ color: 'var(--accent)' }}
          />
          <Button
            size="small"
            type="text"
            danger={record.is_active}
            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={(e) => { e.stopPropagation(); toggleActive(record); }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <Title level={3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          {t('adminUsers.userManagement')}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/users/new')}
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 10, height: 40, fontWeight: 600,
          }}
        >
          {t('adminUsers.newUser')}
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 14,
        padding: isMobile ? '14px 16px' : '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginBottom: 12, color: 'var(--text-tertiary)',
        }}>
          <FilterOutlined style={{ fontSize: 13 }} />
          <Text style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {t('common.filters')}
          </Text>
        </div>
        <Space wrap>
          <Input
            placeholder={t('common.search')}
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            allowClear
            style={{ width: 220, borderRadius: 10 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchUsers()}
          />
          <Select
            placeholder={t('adminUsers.role')}
            allowClear
            style={{ width: 130 }}
            value={roleFilter || undefined}
            onChange={(v) => setRoleFilter(v || '')}
            options={[
              { value: 'customer', label: t('adminUsers.customer') },
              { value: 'admin', label: t('common.admin') },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
            <Switch
              size="small"
              checked={showArchived}
              onChange={setShowArchived}
            />
            <Text style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('common.showArchived')}
            </Text>
          </div>
        </Space>
      </div>

      {/* Content */}
      {isMobile ? (
        <>
          {loading && users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
              {t('common.loading')}
            </div>
          ) : users.length === 0 ? (
            <Empty description={t('adminUsers.noUsers')} />
          ) : (
            <>
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 6,
                  }}>
                    <Text style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                      {u.full_name}
                    </Text>
                    <Tag color={u.is_active ? 'green' : 'red'}>
                      {u.is_active ? t('common.active') : t('common.inactive')}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {u.email}
                    {u.user_type === 'company' && u.company_name && (
                      <span style={{ color: 'var(--text-tertiary)' }}> · {u.company_name}</span>
                    )}
                    {u.company_id && (
                      <span style={{ color: 'var(--text-tertiary)' }}> · {u.company_id}</span>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tag color={u.role === 'admin' ? 'purple' : 'blue'}>{u.role}</Tag>
                      <Tag color={u.user_type === 'company' ? 'gold' : 'default'}>
                        {u.user_type === 'company' ? t('adminUsers.company') : t('adminUsers.personal')}
                      </Tag>
                      {u.role === 'customer' && u.order_count != null && (
                        <Tag
                          color="cyan"
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/orders?user_id=${u.id}&user_name=${encodeURIComponent(u.full_name)}`);
                          }}
                        >
                          <ShoppingOutlined /> {u.order_count} {t('adminUsers.ordersCount').toLowerCase()}
                        </Tag>
                      )}
                    </div>
                    <RightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 11 }} />
                  </div>
                </div>
              ))}
              {pagination.current * pagination.pageSize < pagination.total && (
                <Button
                  block
                  loading={loading}
                  onClick={() => fetchUsers(pagination.current + 1)}
                  style={{
                    marginTop: 12, height: 46, borderRadius: 12,
                    fontWeight: 600, border: '1px solid var(--border-color)',
                  }}
                >
                  {t('common.loadMore')}
                </Button>
              )}
            </>
          )}
        </>
      ) : (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            size="middle"
            scroll={{ x: 700 }}
            pagination={{
              ...pagination,
              onChange: fetchUsers,
              showSizeChanger: false,
              style: { padding: '0 16px' },
            }}
          />
        </div>
      )}
    </div>
  );
}
