import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, Select, Row, Col, Grid, Statistic } from 'antd';
import {
  RiseOutlined, FallOutlined, ShoppingCartOutlined,
  CalendarOutlined, DollarOutlined, CarOutlined,
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
  new: '#1677ff',
  under_review: '#fa8c16',
  approved: '#13c2c2',
  in_progress: '#2f54eb',
  completed: '#52c41a',
  rejected: '#ff4d4f',
  cancelled: '#999',
};

const URGENCY_COLORS = {
  low: '#52c41a',
  normal: '#1677ff',
  high: '#fa8c16',
  urgent: '#ff4d4f',
};

const USER_TYPE_COLORS = {
  personal: '#1677ff',
  company: '#faad14',
};

const FLEET_STATUS_COLORS = {
  available: '#52c41a',
  in_use: '#1677ff',
  maintenance: '#fa8c16',
  retired: '#ff4d4f',
};

const PIE_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#ff4d4f', '#13c2c2', '#722ed1', '#eb2f96', '#faad14'];

export default function AdminAnalyticsPage() {
  const screens = useBreakpoint();
  const { isDark } = useTheme();
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const isMobile = !screens.md;
  const textColor = isDark ? '#e8e8e8' : '#333';
  const subTextColor = isDark ? '#6b6b6b' : '#999';
  const gridColor = isDark ? '#303030' : '#f0f0f0';
  const tooltipBg = isDark ? '#1f1f1f' : '#fff';
  const tooltipBorder = isDark ? '#303030' : '#f0f0f0';

  useEffect(() => {
    setLoading(true);
    api.get('/auth/admin/analytics/', { params: { days: period } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
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
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: textColor, fontWeight: 600 },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          {t('analytics.title')}
        </Title>
        <Select
          value={period}
          onChange={setPeriod}
          style={{ width: 140 }}
          options={[
            { value: 7, label: t('analytics.last7') },
            { value: 14, label: t('analytics.last14') },
            { value: 30, label: t('analytics.last30') },
            { value: 60, label: t('analytics.last60') },
            { value: 90, label: t('analytics.last90') },
          ]}
        />
      </div>

      {/* ── Quick Stats ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          {
            title: t('analytics.today'),
            value: data.today_orders,
            icon: <CalendarOutlined />,
            color: '#1677ff',
          },
          {
            title: t('analytics.thisWeek'),
            value: data.this_week_orders,
            icon: <ShoppingCartOutlined />,
            color: '#13c2c2',
          },
          {
            title: t('analytics.thisMonth'),
            value: data.this_month_orders,
            icon: <ShoppingCartOutlined />,
            color: '#722ed1',
          },
          {
            title: t('analytics.periodOrders', { days: period }),
            value: comparison.current_orders,
            suffix: orderChange !== 0 ? (
              <span style={{ fontSize: 13, color: orderChange > 0 ? '#52c41a' : '#ff4d4f', marginLeft: 4 }}>
                {orderChange > 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(orderChange)}%
              </span>
            ) : null,
            icon: <RiseOutlined />,
            color: '#52c41a',
          },
          {
            title: t('analytics.estRevenue'),
            value: `$${data.revenue.total_estimated.toLocaleString()}`,
            icon: <DollarOutlined />,
            color: '#fa8c16',
            isStr: true,
          },
          {
            title: t('analytics.avgPerHour'),
            value: `$${data.revenue.avg_price_per_hour}`,
            icon: <DollarOutlined />,
            color: '#eb2f96',
            isStr: true,
          },
        ].map((s, i) => (
          <Col xs={12} sm={8} md={8} lg={4} key={i}>
            <Card size="small" bodyStyle={{ padding: isMobile ? 12 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${s.color}14`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: s.color, flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
                    {s.isStr ? s.value : s.value || 0}
                    {s.suffix}
                  </div>
                  <div style={{ fontSize: 11, color: subTextColor, whiteSpace: 'nowrap' }}>{s.title}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Daily Orders Chart ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card title={t('analytics.dailyOrders')} size="small">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.daily_orders}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
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
                <Area type="monotone" dataKey="total" stroke="#1677ff" fill="url(#gradTotal)" name={t('analytics.total')} strokeWidth={2} />
                <Area type="monotone" dataKey="completed" stroke="#52c41a" fill="url(#gradCompleted)" name={t('status.completed')} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={t('analytics.ordersByStatus')} size="small">
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
          </Card>
        </Col>
      </Row>

      {/* ── Revenue & Category Breakdown ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card title={t('analytics.ordersByCategory')} size="small">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.by_category} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                <YAxis
                  dataKey="name" type="category" width={isMobile ? 80 : 120}
                  tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
                />
                <Tooltip {...customTooltip} />
                <Bar dataKey="count" name={t('nav.orders')} radius={[0, 4, 4, 0]}>
                  {data.by_category.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={t('analytics.revenueByCategory')} size="small">
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
                  <Bar dataKey="revenue" name={`${t('analytics.revenue')} ($)`} fill="#fa8c16" radius={[0, 4, 4, 0]}>
                    {data.revenue.by_category.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: subTextColor }}>
                {t('analytics.noRevenueData')}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Weekly / Monthly Trends ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card title={t('analytics.weeklyTrend')} size="small">
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
                <Bar dataKey="total" name={t('analytics.total')} fill="#1677ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name={t('status.completed')} fill="#52c41a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={t('analytics.monthlyTrend')} size="small">
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
                <Line type="monotone" dataKey="total" stroke="#1677ff" name={t('analytics.total')} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed" stroke="#52c41a" name={t('status.completed')} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Urgency, Fleet, New Users ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card title={t('analytics.ordersByUrgency')} size="small">
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
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card title={t('analytics.fleetStatus')} size="small">
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
          </Card>
        </Col>

        <Col xs={24} sm={24} lg={8}>
          <Card title={t('analytics.newUsers')} size="small" extra={<UserAddOutlined />}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.new_users_daily}>
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#722ed1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#722ed1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date" tickFormatter={(v) => v.slice(5)}
                  tick={{ fontSize: 10, fill: subTextColor }} stroke={gridColor}
                />
                <YAxis tick={{ fontSize: 10, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
                <Tooltip {...customTooltip} />
                <Area type="monotone" dataKey="count" stroke="#722ed1" fill="url(#gradUsers)" name={t('analytics.newUsers')} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Fleet by Category ── */}
      {data.fleet_by_category.length > 0 && (
        <Card title={t('analytics.vehiclesByCategory')} size="small" style={{ marginBottom: 20 }}>
          <ResponsiveContainer width="100%" height={Math.max(180, data.fleet_by_category.length * 36)}>
            <BarChart data={data.fleet_by_category} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor} allowDecimals={false} />
              <YAxis
                dataKey="name" type="category" width={isMobile ? 80 : 140}
                tick={{ fontSize: 11, fill: subTextColor }} stroke={gridColor}
              />
              <Tooltip {...customTooltip} />
              <Bar dataKey="count" name={t('nav.vehicles')} radius={[0, 4, 4, 0]}>
                {data.fleet_by_category.map((entry, i) => (
                  <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Users by Type & Orders by User Type ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <Card title={t('analytics.usersByType')} size="small">
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
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card title={t('analytics.ordersByUserType')} size="small">
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
          </Card>
        </Col>
      </Row>

      {/* ── Revenue Trend ── */}
      {data.revenue.daily_trend.length > 0 && (
        <Card title={t('analytics.dailyRevenue')} size="small" style={{ marginBottom: 20 }}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.revenue.daily_trend}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fa8c16" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fa8c16" stopOpacity={0} />
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
              <Area type="monotone" dataKey="revenue" stroke="#fa8c16" fill="url(#gradRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
