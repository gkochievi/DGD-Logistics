import React, { useEffect, useState } from 'react';
import { Typography, Spin, Select, Row, Col, Grid } from 'antd';
import {
  RiseOutlined, FallOutlined, ShoppingCartOutlined,
  CalendarOutlined, DollarOutlined,
  UserAddOutlined, BarChartOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts';
import api from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_COLORS = {
  new: '#00B856',
  under_review: '#f59e0b',
  approved: '#06b6d4',
  in_progress: '#3b82f6',
  completed: '#10b981',
  rejected: '#ef4444',
  cancelled: '#9ca3af',
};

const URGENCY_COLORS = {
  low: '#10b981',
  normal: '#00B856',
  high: '#f59e0b',
  urgent: '#ef4444',
};

const USER_TYPE_COLORS = {
  personal: '#00B856',
  company: '#f59e0b',
};

const FLEET_STATUS_COLORS = {
  available: '#10b981',
  in_use: '#00B856',
  maintenance: '#f59e0b',
  retired: '#ef4444',
};

const PIE_COLORS = ['#00B856', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#009E4A', '#ec4899', '#f59e0b'];

export default function AdminAnalyticsPage() {
  const screens = useBreakpoint();
  const { isDark } = useTheme();
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const isMobile = !screens.md;
  const textColor = isDark ? '#e8e8e8' : '#333';
  const subTextColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#1f2128' : '#f0f0f0';
  const tooltipBg = isDark ? '#1a1c24' : '#fff';
  const tooltipBorder = isDark ? '#1f2128' : '#e5e7eb';

  useEffect(() => {
    setLoading(true);
    api.get('/auth/admin/analytics/', { params: { days: period } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) return null;

  const { comparison } = data;
  const orderChange = comparison.previous_orders
    ? Math.round(((comparison.current_orders - comparison.previous_orders) / comparison.previous_orders) * 100)
    : 0;
  const completedChange = comparison.previous_completed
    ? Math.round(((comparison.current_completed - comparison.previous_completed) / comparison.previous_completed) * 100)
    : 0;

  const customTooltip = {
    contentStyle: {
      background: tooltipBg,
      border: `1px solid ${tooltipBorder}`,
      borderRadius: 12,
      fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      padding: '10px 14px',
    },
    labelStyle: { color: textColor, fontWeight: 600 },
  };

  const chartCardStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    overflow: 'hidden',
  };

  const chartHeaderStyle = {
    padding: '16px 20px 0',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  };

  const chartBodyStyle = {
    padding: '16px 12px 16px 0',
  };

  const statCards = [
    {
      title: t('analytics.today'),
      value: data.today_orders,
      icon: <CalendarOutlined />,
      color: '#00B856',
    },
    {
      title: t('analytics.thisWeek'),
      value: data.this_week_orders,
      icon: <ShoppingCartOutlined />,
      color: '#06b6d4',
    },
    {
      title: t('analytics.thisMonth'),
      value: data.this_month_orders,
      icon: <ShoppingCartOutlined />,
      color: '#009E4A',
    },
    {
      title: t('analytics.periodOrders', { days: period }),
      value: comparison.current_orders,
      suffix: orderChange !== 0 ? (
        <span style={{
          fontSize: 12, color: orderChange > 0 ? '#10b981' : '#ef4444',
          marginLeft: 4, fontWeight: 600,
        }}>
          {orderChange > 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(orderChange)}%
        </span>
      ) : null,
      icon: <RiseOutlined />,
      color: '#10b981',
    },
    {
      title: t('analytics.estRevenue'),
      value: `$${data.revenue.total_estimated.toLocaleString()}`,
      icon: <DollarOutlined />,
      color: '#f59e0b',
      isStr: true,
    },
    {
      title: t('analytics.avgPerHour'),
      value: `$${data.revenue.avg_price_per_hour}`,
      icon: <DollarOutlined />,
      color: '#ec4899',
      isStr: true,
    },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        <Title level={3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          <BarChartOutlined style={{ marginRight: 10, color: 'var(--accent)' }} />
          {t('analytics.title')}
        </Title>
        <Select
          value={period}
          onChange={setPeriod}
          style={{ width: 150 }}
          options={[
            { value: 7, label: t('analytics.last7') },
            { value: 14, label: t('analytics.last14') },
            { value: 30, label: t('analytics.last30') },
            { value: 60, label: t('analytics.last60') },
            { value: 90, label: t('analytics.last90') },
          ]}
        />
      </div>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={8} md={8} lg={4} key={i}>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 16,
              padding: isMobile ? 14 : 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: s.color, flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: isMobile ? 20 : 24, fontWeight: 800,
                    color: s.color, lineHeight: 1.1, letterSpacing: '-0.02em',
                  }}>
                    {s.isStr ? s.value : s.value || 0}
                    {s.suffix}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-tertiary)',
                    whiteSpace: 'nowrap', fontWeight: 500, marginTop: 2,
                  }}>
                    {s.title}
                  </div>
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Daily Orders Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.dailyOrders')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.daily_orders}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00B856" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00B856" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date" tickFormatter={(v) => v.slice(5)}
                    tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                  />
                  <YAxis tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                  <Tooltip {...customTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" stroke="#00B856" fill="url(#gradTotal)" name={t('analytics.total')} strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#gradCompleted)" name={t('status.completed')} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.ordersByStatus')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.by_status.map((s) => ({ ...s, name: t('status.' + s.status) }))}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 70 : 90}
                    innerRadius={isMobile ? 35 : 45}
                    paddingAngle={2}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ stroke: subTextColor }}
                  >
                    {data.by_status.map((s, i) => (
                      <Cell key={i} fill={STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...customTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>
      </Row>

      {/* Revenue & Category Breakdown */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.ordersByCategory')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.by_category} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                  <YAxis
                    dataKey="name" type="category" width={isMobile ? 80 : 120}
                    tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                  />
                  <Tooltip {...customTooltip} />
                  <Bar dataKey="count" name={t('nav.orders')} radius={[0, 6, 6, 0]}>
                    {data.by_category.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.revenueByCategory')}</div>
            <div style={chartBodyStyle}>
              {data.revenue.by_category.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.revenue.by_category} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      type="number" tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis
                      dataKey="name" type="category" width={isMobile ? 80 : 120}
                      tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                    />
                    <Tooltip
                      {...customTooltip}
                      formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                    />
                    <Bar dataKey="revenue" name={`${t('analytics.revenue')} ($)`} fill="#f59e0b" radius={[0, 6, 6, 0]}>
                      {data.revenue.by_category.map((entry, i) => (
                        <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
                  {t('analytics.noRevenueData')}
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Weekly / Monthly Trends */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.weeklyTrend')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.weekly_orders}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="week" tickFormatter={(v) => v.slice(5, 10)}
                    tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                  />
                  <YAxis tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                  <Tooltip {...customTooltip} labelFormatter={(v) => `${t('analytics.weekOf')} ${v}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total" name={t('analytics.total')} fill="#00B856" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completed" name={t('status.completed')} fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.monthlyTrend')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.monthly_orders}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="month" tickFormatter={(v) => v.slice(5)}
                    tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                  />
                  <YAxis tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                  <Tooltip {...customTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" stroke="#00B856" name={t('analytics.total')} strokeWidth={2.5} dot={{ r: 4, fill: '#00B856' }} />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" name={t('status.completed')} strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>
      </Row>

      {/* Urgency, Fleet, New Users */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.ordersByUrgency')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.by_urgency.map((u) => ({
                      name: t('urgency.' + u.urgency),
                      count: u.count,
                      urgency: u.urgency,
                    }))}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ stroke: subTextColor }}
                  >
                    {data.by_urgency.map((u, i) => (
                      <Cell key={i} fill={URGENCY_COLORS[u.urgency] || PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip {...customTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.fleetStatus')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.fleet_by_status.map((f) => ({
                      name: f.status === 'available' ? t('adminVehicles.available')
                        : f.status === 'in_use' ? t('adminVehicles.inUse')
                        : f.status === 'maintenance' ? t('adminVehicles.maintenance')
                        : f.status === 'retired' ? t('adminVehicles.retired')
                        : f.status,
                      count: f.count,
                      status: f.status,
                    }))}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ stroke: subTextColor }}
                  >
                    {data.fleet_by_status.map((f, i) => (
                      <Cell key={i} fill={FLEET_STATUS_COLORS[f.status] || PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip {...customTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={24} lg={8}>
          <div style={chartCardStyle}>
            <div style={{ ...chartHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('analytics.newUsers')}</span>
              <UserAddOutlined style={{ color: 'var(--text-tertiary)', fontSize: 16 }} />
            </div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.new_users_daily}>
                  <defs>
                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#009E4A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#009E4A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date" tickFormatter={(v) => v.slice(5)}
                    tick={{ fontSize: 10, fill: subTextColor }} stroke={gridColor}
                  />
                  <YAxis tick={{ fontSize: 10, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                  <Tooltip {...customTooltip} />
                  <Area type="monotone" dataKey="count" stroke="#009E4A" fill="url(#gradUsers)" name={t('analytics.newUsers')} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>
      </Row>

      {/* Fleet by Category */}
      {data.fleet_by_category.length > 0 && (
        <div style={{ ...chartCardStyle, marginBottom: 24 }}>
          <div style={chartHeaderStyle}>{t('analytics.vehiclesByCategory')}</div>
          <div style={chartBodyStyle}>
            <ResponsiveContainer width="100%" height={Math.max(180, data.fleet_by_category.length * 36)}>
              <BarChart data={data.fleet_by_category} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                <YAxis
                  dataKey="name" type="category" width={isMobile ? 80 : 140}
                  tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                />
                <Tooltip {...customTooltip} />
                <Bar dataKey="count" name={t('nav.vehicles')} radius={[0, 6, 6, 0]}>
                  {data.fleet_by_category.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Users by Type & Orders by User Type */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.usersByType')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: t('analytics.personalUsers'), count: data.total_personal_users || 0, type: 'personal' },
                      { name: t('analytics.companyUsers'), count: data.total_company_users || 0, type: 'company' },
                    ].filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={2}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ stroke: subTextColor }}
                  >
                    {[
                      { type: 'personal' },
                      { type: 'company' },
                    ].map((d, i) => (
                      <Cell key={i} fill={USER_TYPE_COLORS[d.type]} />
                    ))}
                  </Pie>
                  <Tooltip {...customTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12}>
          <div style={chartCardStyle}>
            <div style={chartHeaderStyle}>{t('analytics.ordersByUserType')}</div>
            <div style={chartBodyStyle}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={(data.orders_by_user_type || []).map((d) => ({
                      name: d.user_type === 'company' ? t('analytics.companyUsers') : t('analytics.personalUsers'),
                      count: d.count,
                      user_type: d.user_type,
                    }))}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={2}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ stroke: subTextColor }}
                  >
                    {(data.orders_by_user_type || []).map((d, i) => (
                      <Cell key={i} fill={USER_TYPE_COLORS[d.user_type] || PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip {...customTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>
      </Row>

      {/* Revenue Trend */}
      {data.revenue.daily_trend.length > 0 && (
        <div style={{ ...chartCardStyle, marginBottom: 24 }}>
          <div style={chartHeaderStyle}>{t('analytics.dailyRevenue')}</div>
          <div style={chartBodyStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.revenue.daily_trend}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date" tickFormatter={(v) => v.slice(5)}
                  tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  {...customTooltip}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, t('analytics.revenue')]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#gradRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
