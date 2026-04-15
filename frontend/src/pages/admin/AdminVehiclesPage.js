import React, { useEffect, useState } from 'react';
import {
  Table, Button, Typography, Tag, Modal, Form, Input, Select, InputNumber, Switch, Space,
  message, Grid, Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, CarOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { useLang } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const VEHICLE_STATUS_COLORS = {
  available: 'green',
  in_use: 'blue',
  maintenance: 'orange',
  retired: 'red',
};

export default function AdminVehiclesPage() {
  const screens = useBreakpoint();
  const { t } = useLang();
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const VEHICLE_STATUS_OPTIONS = [
    { value: 'available', label: t('adminVehicles.available') },
    { value: 'in_use', label: t('adminVehicles.inUse') },
    { value: 'maintenance', label: t('adminVehicles.maintenance') },
    { value: 'retired', label: t('adminVehicles.retired') },
  ];

  const fetchVehicles = () => {
    setLoading(true);
    api.get('/vehicles/admin/').then(({ data }) => {
      const results = data.results || data;
      setVehicles(Array.isArray(results) ? results : []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
    api.get('/categories/').then(({ data }) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    });
  }, []);

  const openModal = (vehicle = null) => {
    setEditingVehicle(vehicle);
    if (vehicle) {
      form.setFieldsValue(vehicle);
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'available', is_active: true });
    }
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      if (editingVehicle) {
        await api.patch(`/vehicles/admin/${editingVehicle.id}/`, values);
        message.success(t('adminVehicles.vehicleUpdated'));
      } else {
        await api.post('/vehicles/admin/', values);
        message.success(t('adminVehicles.vehicleCreated'));
      }
      setModalOpen(false);
      fetchVehicles();
    } catch (err) {
      const detail = err.response?.data;
      const firstErr = detail ? Object.values(detail).flat()[0] : t('adminVehicles.vehicleUpdated');
      message.error(typeof firstErr === 'string' ? firstErr : t('adminVehicles.vehicleUpdated'));
    } finally {
      setSaving(false);
    }
  };

  const isMobile = !screens.md;

  const getVehicleStatusLabel = (status) => {
    const labels = {
      available: t('adminVehicles.available'),
      in_use: t('adminVehicles.inUse'),
      maintenance: t('adminVehicles.maintenance'),
      retired: t('adminVehicles.retired'),
    };
    return labels[status] || status;
  };

  const columns = [
    {
      title: '', width: 52,
      render: (_, r) => (
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `color-mix(in srgb, ${r.category_color || 'var(--accent)'} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, color: r.category_color || 'var(--accent)',
        }}>
          {getCategoryIcon(r.category_icon)}
        </div>
      ),
    },
    {
      title: t('adminUsers.name'), dataIndex: 'name', ellipsis: true,
      render: (name) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    { title: t('adminVehicles.plateNumber'), dataIndex: 'plate_number', width: 110 },
    { title: t('adminOrders.category'), dataIndex: 'category_name', width: 140, ellipsis: true },
    { title: t('adminVehicles.capacity'), dataIndex: 'capacity', width: 100, ellipsis: true },
    {
      title: t('adminVehicles.pricePerHour'), dataIndex: 'price_per_hour', width: 100,
      render: (v) => v ? (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${v}</span>
      ) : (
        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
      ),
    },
    {
      title: t('adminVehicles.status'), dataIndex: 'status', width: 130,
      render: (s) => <Tag color={VEHICLE_STATUS_COLORS[s]}>{getVehicleStatusLabel(s)}</Tag>,
    },
    {
      title: '', width: 50,
      render: (_, record) => (
        <Button
          size="small" type="text"
          icon={<EditOutlined />}
          onClick={(e) => { e.stopPropagation(); openModal(record); }}
          style={{ color: 'var(--accent)' }}
        />
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
          {t('adminVehicles.title')}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          style={{
            background: 'var(--accent)', borderColor: 'var(--accent)',
            borderRadius: 10, height: 40, fontWeight: 600,
          }}
        >
          {t('adminVehicles.addVehicle')}
        </Button>
      </div>

      {/* Content */}
      {isMobile ? (
        loading && vehicles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
            {t('common.loading')}
          </div>
        ) : vehicles.length === 0 ? (
          <Empty description={t('adminVehicles.noVehicles')} />
        ) : (
          vehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => openModal(v)}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 14,
                padding: '16px',
                marginBottom: 10,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: `color-mix(in srgb, ${v.category_color || 'var(--accent)'} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: v.category_color || 'var(--accent)', flexShrink: 0,
                }}>
                  {getCategoryIcon(v.category_icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    {v.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {v.plate_number} · {v.category_name} · {v.capacity || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Tag color={VEHICLE_STATUS_COLORS[v.status]} style={{ margin: 0 }}>
                    {getVehicleStatusLabel(v.status)}
                  </Tag>
                  {v.price_per_hour && (
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      ${v.price_per_hour}/{t('common.perHour')}
                    </Text>
                  )}
                </div>
              </div>
            </div>
          ))
        )
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
            dataSource={vehicles}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={false}
          />
        </div>
      )}

      {/* Modal */}
      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
            {editingVehicle ? t('adminVehicles.editVehicle') : t('adminVehicles.addVehicle')}
          </span>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
        width={580}
        styles={{
          content: { borderRadius: 16, padding: 0 },
          header: { padding: '20px 24px 0', borderBottom: 'none' },
          body: { padding: '16px 24px 24px' },
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>{t('adminVehicles.vehicleName')}</span>}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input placeholder={t('adminVehicles.vehicleNamePlaceholder')} style={{ borderRadius: 10 }} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 14 }}>
            <Form.Item
              name="category"
              label={<span style={{ fontWeight: 600 }}>{t('adminOrders.category')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder={t('adminOrderDetail.selectFinalCategory')}
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
            <Form.Item
              name="plate_number"
              label={<span style={{ fontWeight: 600 }}>{t('adminVehicles.plateNumber')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1 }}
            >
              <Input placeholder={t('adminVehicles.plateNumberPlaceholder')} style={{ borderRadius: 10 }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <Form.Item
              name="year"
              label={<span style={{ fontWeight: 600 }}>{t('adminVehicles.year')}</span>}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="2023" style={{ width: '100%', borderRadius: 10 }} min={1990} max={2030} />
            </Form.Item>
            <Form.Item
              name="capacity"
              label={<span style={{ fontWeight: 600 }}>{t('adminVehicles.capacity')}</span>}
              style={{ flex: 1 }}
            >
              <Input placeholder={t('adminVehicles.capacityPlaceholder')} style={{ borderRadius: 10 }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <Form.Item
              name="price_per_hour"
              label={<span style={{ fontWeight: 600 }}>{t('adminVehicles.pricePerHour')}</span>}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="85.00" style={{ width: '100%', borderRadius: 10 }} min={0} step={5} />
            </Form.Item>
            <Form.Item
              name="price_per_km"
              label={<span style={{ fontWeight: 600 }}>{t('adminVehicles.pricePerKm')}</span>}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="3.50" style={{ width: '100%', borderRadius: 10 }} min={0} step={0.5} />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 600 }}>{t('orders.description')}</span>}
          >
            <TextArea rows={3} placeholder={t('adminVehicles.vehicleNamePlaceholder')} style={{ borderRadius: 10 }} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Form.Item
              name="status"
              label={<span style={{ fontWeight: 600 }}>{t('adminVehicles.status')}</span>}
              style={{ flex: 1 }}
            >
              <Select options={VEHICLE_STATUS_OPTIONS} />
            </Form.Item>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--bg-secondary)',
              borderRadius: 12, marginTop: 30, minWidth: 120, gap: 10,
            }}>
              <Text style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                {t('common.active')}
              </Text>
              <Form.Item name="is_active" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={saving}
              size="large"
              style={{
                background: 'var(--accent)', borderColor: 'var(--accent)',
                borderRadius: 12, height: 46, fontWeight: 700, fontSize: 15,
              }}
            >
              {editingVehicle ? t('profile.saveChanges') : t('adminVehicles.addVehicle')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
