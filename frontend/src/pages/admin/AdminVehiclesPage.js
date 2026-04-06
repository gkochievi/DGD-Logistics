import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Typography, Tag, Modal, Form, Input, Select, InputNumber, Switch, Space,
  message, Grid, List, Empty, Upload,
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
      title: '', width: 48,
      render: (_, r) => (
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${r.category_color || '#1677ff'}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: r.category_color || '#1677ff',
        }}>
          {getCategoryIcon(r.category_icon)}
        </div>
      ),
    },
    { title: t('adminUsers.name'), dataIndex: 'name', ellipsis: true },
    { title: t('adminVehicles.plateNumber'), dataIndex: 'plate_number', width: 100 },
    { title: t('adminOrders.category'), dataIndex: 'category_name', width: 140, ellipsis: true },
    { title: t('adminVehicles.capacity'), dataIndex: 'capacity', width: 100, ellipsis: true },
    {
      title: t('adminVehicles.pricePerHour'), dataIndex: 'price_per_hour', width: 90,
      render: (v) => v ? `$${v}` : '—',
    },
    {
      title: t('adminVehicles.status'), dataIndex: 'status', width: 130,
      render: (s) => <Tag color={VEHICLE_STATUS_COLORS[s]}>{getVehicleStatusLabel(s)}</Tag>,
    },
    {
      title: '', width: 50,
      render: (_, record) => (
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openModal(record)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('adminVehicles.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          {t('adminVehicles.addVehicle')}
        </Button>
      </div>

      {isMobile ? (
        <List
          loading={loading}
          dataSource={vehicles}
          locale={{ emptyText: <Empty description={t('adminVehicles.noVehicles')} /> }}
          renderItem={(v) => (
            <Card size="small" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => openModal(v)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${v.category_color || '#1677ff'}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: v.category_color || '#1677ff', flexShrink: 0,
                }}>
                  {getCategoryIcon(v.category_icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {v.plate_number} · {v.category_name} · {v.capacity || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Tag color={VEHICLE_STATUS_COLORS[v.status]} style={{ margin: 0 }}>{getVehicleStatusLabel(v.status)}</Tag>
                  {v.price_per_hour && <Text type="secondary" style={{ fontSize: 12 }}>${v.price_per_hour}/{t('common.perHour')}</Text>}
                </div>
              </div>
            </Card>
          )}
        />
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <Table columns={columns} dataSource={vehicles} rowKey="id" loading={loading} size="middle" pagination={false} />
        </Card>
      )}

      <Modal
        title={editingVehicle ? t('adminVehicles.editVehicle') : t('adminVehicles.addVehicle')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label={t('adminVehicles.vehicleName')} rules={[{ required: true, message: t('common.required') }]}>
            <Input placeholder={t('adminVehicles.vehicleNamePlaceholder')} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="category" label={t('adminOrders.category')} rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1 }}>
              <Select
                placeholder={t('adminOrderDetail.selectFinalCategory')}
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
            <Form.Item name="plate_number" label={t('adminVehicles.plateNumber')} rules={[{ required: true, message: t('common.required') }]} style={{ flex: 1 }}>
              <Input placeholder={t('adminVehicles.plateNumberPlaceholder')} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="year" label={t('adminVehicles.year')} style={{ flex: 1 }}>
              <InputNumber placeholder="2023" style={{ width: '100%' }} min={1990} max={2030} />
            </Form.Item>
            <Form.Item name="capacity" label={t('adminVehicles.capacity')} style={{ flex: 1 }}>
              <Input placeholder={t('adminVehicles.capacityPlaceholder')} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="price_per_hour" label={t('adminVehicles.pricePerHour')} style={{ flex: 1 }}>
              <InputNumber placeholder="85.00" style={{ width: '100%' }} min={0} step={5} />
            </Form.Item>
            <Form.Item name="price_per_km" label={t('adminVehicles.pricePerKm')} style={{ flex: 1 }}>
              <InputNumber placeholder="3.50" style={{ width: '100%' }} min={0} step={0.5} />
            </Form.Item>
          </div>

          <Form.Item name="description" label={t('orders.description')}>
            <TextArea rows={3} placeholder={t('adminVehicles.vehicleNamePlaceholder')} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="status" label={t('adminVehicles.status')} style={{ flex: 1 }}>
              <Select options={VEHICLE_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="is_active" label={t('common.active')} valuePropName="checked" style={{ flex: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={saving}>
              {editingVehicle ? t('profile.saveChanges') : t('adminVehicles.addVehicle')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
