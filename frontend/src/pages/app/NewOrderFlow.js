import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, DatePicker, TimePicker, Upload, Typography, message, Empty, Spin } from 'antd';
import {
  ArrowLeftOutlined, RocketOutlined, EnvironmentOutlined,
  CalendarOutlined, UserOutlined, PhoneOutlined, CameraOutlined,
  CheckCircleOutlined, BulbOutlined, CloseOutlined, SearchOutlined,
  SwapRightOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { getCategoryIcon } from '../../utils/categoryIcons';
import MapPicker from '../../components/map/MapPicker';

const { TextArea } = Input;

export default function NewOrderFlow() {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Steps: 0=category, 1=vehicle, 2=details, 3=confirm
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [catSearch, setCatSearch] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [showPickupMap, setShowPickupMap] = useState(false);
  const [showDestMap, setShowDestMap] = useState(false);

  const needsDest = selectedCategory?.requires_destination;

  useEffect(() => {
    api.get('/categories/').then(({ data }) => {
      const cats = Array.isArray(data) ? data : data.results || [];
      setCategories(cats);
      const catId = searchParams.get('category');
      if (catId) {
        const found = cats.find((c) => String(c.id) === catId);
        if (found) {
          setSelectedCategory(found);
          setStep(1);
          fetchVehicles(found.id);
        }
      }
    });
  }, [searchParams]); // eslint-disable-line

  const fetchVehicles = (categoryId) => {
    setVehiclesLoading(true);
    api.get(`/vehicles/?category=${categoryId}`).then(({ data }) => {
      const list = Array.isArray(data) ? data : data.results || [];
      setVehicles(list);
    }).catch(() => setVehicles([]))
      .finally(() => setVehiclesLoading(false));
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setSelectedVehicle(null);
    form.setFieldsValue({
      selected_category: cat.id,
      contact_name: form.getFieldValue('contact_name') || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      contact_phone: form.getFieldValue('contact_phone') || user?.phone_number || '',
    });
    fetchVehicles(cat.id);
    setStep(1);
  };

  const handleVehicleSelect = (v) => {
    setSelectedVehicle(v);
    setStep(2);
  };

  const skipVehicle = () => {
    setSelectedVehicle(null);
    setStep(2);
  };

  const handleDescriptionBlur = async () => {
    const desc = form.getFieldValue('description');
    if (desc && desc.length > 10) {
      try {
        const { data } = await api.post('/categories/suggest/', { description: desc });
        if (data.id && data.id !== selectedCategory?.id) setSuggestion(data);
      } catch { /* ignore */ }
    }
  };

  const applySuggestion = () => {
    if (suggestion) {
      const cat = categories.find((c) => c.id === suggestion.id) || suggestion;
      setSelectedCategory(cat);
      form.setFieldsValue({ selected_category: cat.id });
      setSuggestion(null);
    }
  };

  const goToConfirm = async () => {
    try {
      const values = await form.validateFields();
      setFormValues(values);
      setStep(3);
    } catch { /* validation errors shown */ }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = formValues;
      const fd = new FormData();
      fd.append('selected_category', selectedCategory.id);
      fd.append('pickup_location', values.pickup_location);
      if (pickupCoords) { fd.append('pickup_lat', pickupCoords.lat); fd.append('pickup_lng', pickupCoords.lng); }
      fd.append('destination_location', values.destination_location || '');
      if (destCoords) { fd.append('destination_lat', destCoords.lat); fd.append('destination_lng', destCoords.lng); }
      fd.append('requested_date', values.requested_date.format('YYYY-MM-DD'));
      if (values.requested_time) fd.append('requested_time', values.requested_time.format('HH:mm'));
      fd.append('contact_name', values.contact_name);
      fd.append('contact_phone', values.contact_phone);
      fd.append('description', values.description);
      fd.append('cargo_details', values.cargo_details || '');
      fd.append('urgency', values.urgency || 'normal');
      fd.append('user_note', values.user_note || '');
      if (suggestion?.id) fd.append('suggested_category', suggestion.id);
      fileList.forEach((f) => fd.append('images', f.originFileObj));

      const { data } = await api.post('/orders/create/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      message.success(t('orders.orderSubmitted'));
      navigate(`/app/orders/${data.id}`);
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const firstErr = Object.values(detail).flat()[0];
        message.error(typeof firstErr === 'string' ? firstErr : t('orders.failedCreate'));
      } else message.error(t('orders.failedCreate'));
    } finally { setLoading(false); }
  };

  const inputStyle = { height: 50, borderRadius: 12, fontSize: 15 };

  // ─── STEP 0: SELECT CATEGORY ───
  if (step === 0) {
    return (
      <div style={{ minHeight: '100vh' }} className="app-bg">
        <AppHeader title={t('newOrder.selectService')} onBack={() => navigate('/app')} />
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {t('newOrder.whatService')}
          </div>
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder={t('newOrder.searchService')}
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            allowClear
            style={{ marginBottom: 14, borderRadius: 12, height: 44 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {categories
              .filter((c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()) || c.description?.toLowerCase().includes(catSearch.toLowerCase()))
              .map((cat) => {
                const color = cat.color || '#1677ff';
                return (
                  <div key={cat.id} onClick={() => handleCategorySelect(cat)}
                    style={{
                      borderRadius: 14, padding: '14px 8px 12px', cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      WebkitTapHighlightColor: 'transparent', background: 'var(--card-bg)',
                    }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 13,
                      background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, color,
                    }}>
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 500, color: 'var(--text-primary)',
                      textAlign: 'center', lineHeight: 1.3,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {cat.name}
                    </div>
                    {cat.requires_destination && (
                      <div style={{ fontSize: 9, color: '#999', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SwapRightOutlined /> {t('newOrder.transportBadge')}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 1: SELECT VEHICLE ───
  if (step === 1) {
    const catColor = selectedCategory?.color || '#1677ff';
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 80 }} className="app-bg">
        <AppHeader
          title={t('newOrder.chooseVehicle')}
          onBack={() => { setStep(0); setCatSearch(''); }}
          right={
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: `${catColor}14`, padding: '4px 10px', borderRadius: 8,
              fontSize: 12, color: catColor, fontWeight: 500,
            }}>
              {getCategoryIcon(selectedCategory?.icon)}
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCategory?.name}
              </span>
            </div>
          }
        />
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {t('newOrder.availableVehicles')} <strong>{selectedCategory?.name}</strong>
          </div>

          {vehiclesLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : vehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Empty description={t('newOrder.noVehicles')} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vehicles.map((v) => (
                <div key={v.id} onClick={() => handleVehicleSelect(v)}
                  style={{
                    background: 'var(--card-bg)', borderRadius: 14, padding: '14px 16px',
                    border: selectedVehicle?.id === v.id ? `2px solid ${catColor}` : '1px solid var(--border-color)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 13,
                    background: `${catColor}14`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, color: catColor, flexShrink: 0,
                  }}>
                    {getCategoryIcon(selectedCategory?.icon)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {v.capacity}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {v.price_per_hour && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: catColor }}>${v.price_per_hour}</div>
                    )}
                    <div style={{ fontSize: 10, color: '#999' }}>{t('common.perHour')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky skip / continue */}
        <StickyBottom>
          <Button block onClick={skipVehicle}
            style={{ height: 48, borderRadius: 14, fontSize: 15, fontWeight: 500 }}>
            {t('newOrder.skipChoose')}
          </Button>
        </StickyBottom>
      </div>
    );
  }

  // ─── STEP 2: ENTER DETAILS ───
  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 100 }} className="app-bg">
        <AppHeader
          title={t('newOrder.orderDetails')}
          onBack={() => setStep(1)}
          right={
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: `${selectedCategory?.color || '#1677ff'}14`,
              padding: '4px 10px', borderRadius: 8,
              fontSize: 12, color: selectedCategory?.color || '#1677ff', fontWeight: 500,
            }}>
              {getCategoryIcon(selectedCategory?.icon)}
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCategory?.name}
              </span>
            </div>
          }
        />

        <div style={{ padding: 20 }}>
          <Form form={form} layout="vertical" requiredMark={false}
            initialValues={{ urgency: 'normal', selected_category: selectedCategory?.id }}>

            <SectionLabel text={t('newOrder.whatDone')} />
            <Form.Item name="description" rules={[{ required: true, message: t('newOrder.describeJob') }]}>
              <TextArea rows={3} placeholder={t('newOrder.describeNeed')} onBlur={handleDescriptionBlur}
                style={{ borderRadius: 12, fontSize: 15 }} />
            </Form.Item>

            {suggestion && (
              <div style={{
                background: '#f0f5ff', borderRadius: 12, padding: '12px 14px',
                marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <BulbOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                <div style={{ flex: 1, fontSize: 13 }}>{t('newOrder.suggested')} <strong>{suggestion.name}</strong></div>
                <Button size="small" type="link" onClick={applySuggestion}>{t('common.apply')}</Button>
                <CloseOutlined onClick={() => setSuggestion(null)} style={{ color: '#999', fontSize: 12, cursor: 'pointer' }} />
              </div>
            )}

            <Form.Item name="cargo_details">
              <TextArea rows={2} placeholder={t('newOrder.cargoDetails')} style={{ borderRadius: 12, fontSize: 15 }} />
            </Form.Item>
            <Form.Item name="urgency">
              <Select options={[
                { value: 'low', label: t('urgency.low') },
                { value: 'normal', label: t('urgency.normal') },
                { value: 'high', label: t('urgency.high') },
                { value: 'urgent', label: t('urgency.urgent') },
              ]} style={{ width: '100%' }} size="large" />
            </Form.Item>

            {/* Location section — smart based on category type */}
            <SectionLabel text={needsDest ? t('newOrder.fromTo') : t('newOrder.workLocation')} />

            <Form.Item name="pickup_location" rules={[{ required: true, message: needsDest ? t('newOrder.enterPickup') : t('newOrder.enterWork') }]}>
              <Input
                prefix={<EnvironmentOutlined style={{ color: needsDest ? '#52c41a' : '#1677ff' }} />}
                placeholder={needsDest ? t('newOrder.pickupFrom') : t('newOrder.workSiteAddress')}
                style={inputStyle}
                suffix={
                  <span onClick={() => setShowPickupMap(!showPickupMap)}
                    style={{ color: '#1677ff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {showPickupMap ? t('newOrder.hide') : t('newOrder.map')}
                  </span>
                }
              />
            </Form.Item>
            {showPickupMap && (
              <div style={{ marginBottom: 16, marginTop: -8 }}>
                <MapPicker
                  position={pickupCoords ? [pickupCoords.lat, pickupCoords.lng] : null}
                  onSelect={({ lat, lng, address }) => { setPickupCoords({ lat, lng }); form.setFieldsValue({ pickup_location: address }); }}
                  height={180} markerColor="green"
                  placeholder={needsDest ? t('newOrder.tapPickup') : t('newOrder.tapLocation')}
                />
              </div>
            )}

            {needsDest && (
              <>
                <Form.Item name="destination_location" rules={[{ required: true, message: t('newOrder.enterDestination') }]}>
                  <Input
                    prefix={<EnvironmentOutlined style={{ color: '#ff4d4f' }} />}
                    placeholder={t('newOrder.destinationTo')}
                    style={inputStyle}
                    suffix={
                      <span onClick={() => setShowDestMap(!showDestMap)}
                        style={{ color: '#1677ff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {showDestMap ? t('newOrder.hide') : t('newOrder.map')}
                      </span>
                    }
                  />
                </Form.Item>
                {showDestMap && (
                  <div style={{ marginBottom: 16, marginTop: -8 }}>
                    <MapPicker
                      position={destCoords ? [destCoords.lat, destCoords.lng] : null}
                      onSelect={({ lat, lng, address }) => { setDestCoords({ lat, lng }); form.setFieldsValue({ destination_location: address }); }}
                      height={180} markerColor="red" placeholder={t('newOrder.tapDestination')}
                    />
                  </div>
                )}
              </>
            )}

            <SectionLabel text={t('newOrder.when')} />
            <Form.Item name="requested_date" rules={[{ required: true, message: t('newOrder.selectDate') }]}>
              <DatePicker style={{ width: '100%', ...inputStyle }} placeholder={t('newOrder.selectDate')}
                disabledDate={(d) => d && d < dayjs().startOf('day')} inputReadOnly suffixIcon={<CalendarOutlined />} />
            </Form.Item>
            <Form.Item name="requested_time">
              <TimePicker format="HH:mm" style={{ width: '100%', ...inputStyle }} placeholder={t('newOrder.preferredTime')} inputReadOnly />
            </Form.Item>

            <SectionLabel text={t('newOrder.contactPerson')} />
            <Form.Item name="contact_name" rules={[{ required: true, message: t('newOrder.enterContact') }]}>
              <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder={t('newOrder.fullName')} autoComplete="name" style={inputStyle} />
            </Form.Item>
            <Form.Item name="contact_phone" rules={[{ required: true, message: t('newOrder.enterPhone') }]}>
              <Input prefix={<PhoneOutlined style={{ color: '#bbb' }} />} placeholder={t('auth.phone')} inputMode="tel" autoComplete="tel" style={inputStyle} />
            </Form.Item>

            <SectionLabel text={t('newOrder.additional')} />
            <Form.Item name="user_note">
              <TextArea rows={2} placeholder={t('newOrder.notesForUs')} style={{ borderRadius: 12, fontSize: 15 }} />
            </Form.Item>
            <Form.Item>
              <Upload listType="picture" fileList={fileList} onChange={({ fileList: fl }) => setFileList(fl)}
                beforeUpload={() => false} multiple accept="image/*">
                <Button icon={<CameraOutlined />} style={{ borderRadius: 10, height: 44 }}>{t('newOrder.addPhotos')}</Button>
              </Upload>
            </Form.Item>
          </Form>
        </div>

        <StickyBottom>
          <Button type="primary" block onClick={goToConfirm}
            style={{ height: 52, borderRadius: 14, fontSize: 16, fontWeight: 600 }}>
            {t('newOrder.reviewOrder')}
          </Button>
        </StickyBottom>
      </div>
    );
  }

  // ─── STEP 3: CONFIRM ───
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }} className="app-bg-alt">
      <AppHeader title={t('newOrder.confirmOrder')} onBack={() => setStep(2)} />
      <div style={{ padding: 20 }}>
        <ConfirmCard>
          <ConfirmRow label={t('newOrder.serviceType')} value={selectedCategory?.name} />
          {selectedVehicle && <ConfirmRow label={t('newOrder.vehicle')} value={`${selectedVehicle.name} — $${selectedVehicle.price_per_hour}/hr`} />}
          <ConfirmRow label={t('adminOrders.urgencyLabel')} value={t('urgency.' + (formValues.urgency || 'normal'))} />
        </ConfirmCard>
        <ConfirmCard>
          <ConfirmRow label={t('orders.description')} value={formValues.description} />
          {formValues.cargo_details && <ConfirmRow label={t('newOrder.cargoDetails')} value={formValues.cargo_details} />}
        </ConfirmCard>
        <ConfirmCard>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
            <EnvironmentOutlined style={{ color: needsDest ? '#52c41a' : '#1677ff', marginTop: 3 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{needsDest ? t('orders.pickup') : t('orders.location')}</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{formValues.pickup_location}</div>
            </div>
          </div>
          {needsDest && formValues.destination_location && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <EnvironmentOutlined style={{ color: '#ff4d4f', marginTop: 3 }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('orders.destination')}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{formValues.destination_location}</div>
              </div>
            </div>
          )}
        </ConfirmCard>
        <ConfirmCard>
          <ConfirmRow label={t('orders.date')} value={formValues.requested_date?.format('DD MMM YYYY')} />
          {formValues.requested_time && <ConfirmRow label={t('orders.time')} value={formValues.requested_time?.format('HH:mm')} />}
        </ConfirmCard>
        <ConfirmCard>
          <ConfirmRow label={t('orders.contact')} value={formValues.contact_name} />
          <ConfirmRow label={t('auth.phone')} value={formValues.contact_phone} />
        </ConfirmCard>
        {fileList.length > 0 && <ConfirmCard><ConfirmRow label={t('orders.photos')} value={t('newOrder.imagesAttached', { count: fileList.length })} /></ConfirmCard>}
        {formValues.user_note && <ConfirmCard><ConfirmRow label={t('newOrder.notes')} value={formValues.user_note} /></ConfirmCard>}
      </div>

      <StickyBottom>
        <Button type="primary" block onClick={handleSubmit} loading={loading} icon={<CheckCircleOutlined />}
          style={{ height: 52, borderRadius: 14, fontSize: 16, fontWeight: 600 }}>
          {t('newOrder.submitOrder')}
        </Button>
      </StickyBottom>
    </div>
  );
}


// ─── Shared components ───

function AppHeader({ title, onBack, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
      background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div onClick={onBack} style={{
        width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)', WebkitTapHighlightColor: 'transparent',
      }}>
        <ArrowLeftOutlined />
      </div>
      <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      {right}
    </div>
  );
}

function StickyBottom({ children }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '12px 20px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)',
      zIndex: 99, maxWidth: 480, margin: '0 auto',
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ text }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, marginTop: 8 }}>{text}</div>;
}

function ConfirmCard({ children }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  );
}

function ConfirmRow({ label, value }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>{value || '—'}</div>
    </div>
  );
}
