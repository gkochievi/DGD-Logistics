import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, DatePicker, TimePicker, Upload, Typography, message, Empty, Spin } from 'antd';
import {
  ArrowLeftOutlined, RocketOutlined, EnvironmentOutlined,
  CalendarOutlined, UserOutlined, PhoneOutlined, CameraOutlined,
  CheckCircleOutlined, BulbOutlined, CloseOutlined, SearchOutlined,
  SwapRightOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();
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

  // Pre-fill from landing page location search
  useEffect(() => {
    const state = location.state;
    if (state) {
      if (state.pickup) {
        form.setFieldsValue({ pickup_location: state.pickup.text || state.pickup.address || '' });
        if (state.pickup.lat && state.pickup.lng) {
          setPickupCoords({ lat: state.pickup.lat, lng: state.pickup.lng });
        }
      }
      if (state.destination) {
        form.setFieldsValue({ destination_location: state.destination.text || state.destination.address || '' });
        if (state.destination.lat && state.destination.lng) {
          setDestCoords({ lat: state.destination.lat, lng: state.destination.lng });
        }
      }
    }
  }, [location.state]); // eslint-disable-line

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
    setSelectedVehicle(selectedVehicle?.id === v.id ? null : v);
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

  const inputStyle = { height: 50, borderRadius: 14, fontSize: 15 };

  const stepLabels = [
    t('newOrder.selectService'),
    t('newOrder.chooseVehicle'),
    t('newOrder.orderDetails'),
    t('newOrder.confirmOrder'),
  ];

  // ─── STEP 0: SELECT CATEGORY ───
  if (step === 0) {
    return (
      <div style={{ minHeight: '100vh' }} className="app-bg">
        <AppHeader title={t('newOrder.selectService')} onBack={() => navigate('/app')} />
        <StepIndicator current={0} labels={stepLabels} />
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{
            fontSize: 15, color: 'var(--text-secondary)', marginBottom: 14,
            fontWeight: 500, letterSpacing: -0.1,
          }}>
            {t('newOrder.whatService')}
          </div>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-placeholder)' }} />}
            placeholder={t('newOrder.searchService')}
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            allowClear
            style={{
              marginBottom: 16, borderRadius: 14, height: 46,
              background: 'var(--input-bg)',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {categories
              .filter((c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()) || c.description?.toLowerCase().includes(catSearch.toLowerCase()))
              .map((cat, idx) => {
                const color = cat.color || 'var(--accent)';
                return (
                  <div key={cat.id} onClick={() => handleCategorySelect(cat)}
                    className="card-interactive"
                    style={{
                      borderRadius: 16, padding: '16px 8px 14px', cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      WebkitTapHighlightColor: 'transparent', background: 'var(--card-bg)',
                      boxShadow: 'var(--shadow-sm)',
                      animation: `fadeInUp 0.4s ease-out ${idx * 0.03}s both`,
                    }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 15,
                      background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color,
                      transition: 'transform 0.2s ease',
                    }}>
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                      textAlign: 'center', lineHeight: 1.3,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {cat.name}
                    </div>
                    {cat.requires_destination && (
                      <div style={{
                        fontSize: 9, color: 'var(--text-tertiary)',
                        display: 'flex', alignItems: 'center', gap: 3,
                        background: 'var(--badge-muted-bg)',
                        padding: '2px 6px', borderRadius: 4,
                      }}>
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
    const catColor = selectedCategory?.color || 'var(--accent)';
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 90 }} className="app-bg">
        <AppHeader
          title={t('newOrder.chooseVehicle')}
          onBack={() => { setStep(0); setCatSearch(''); }}
          right={
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${catColor}14`, padding: '5px 12px', borderRadius: 10,
              fontSize: 12, color: catColor, fontWeight: 600,
            }}>
              {getCategoryIcon(selectedCategory?.icon)}
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCategory?.name}
              </span>
            </div>
          }
        />
        <StepIndicator current={1} labels={stepLabels} />
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{
            fontSize: 15, color: 'var(--text-secondary)', marginBottom: 16,
            fontWeight: 500, letterSpacing: -0.1,
          }}>
            {t('newOrder.availableVehicles')} <strong>{selectedCategory?.name}</strong>
          </div>

          {vehiclesLoading ? (
            <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
          ) : vehicles.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: 'var(--card-bg)', borderRadius: 16,
              border: '1px solid var(--border-color)',
            }}>
              <Empty description={t('newOrder.noVehicles')} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vehicles.map((v, idx) => {
                const isSelected = selectedVehicle?.id === v.id;
                return (
                  <div key={v.id} onClick={() => handleVehicleSelect(v)}
                    className="card-interactive"
                    style={{
                      background: 'var(--card-bg)', borderRadius: 16, padding: '16px',
                      border: isSelected ? `2px solid ${catColor}` : '1px solid var(--border-color)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                      boxShadow: isSelected ? `0 0 0 3px ${catColor}18` : 'var(--shadow-sm)',
                      animation: `fadeInUp 0.4s ease-out ${idx * 0.05}s both`,
                      transition: 'all 0.2s ease',
                    }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: `${catColor}12`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: catColor, flexShrink: 0,
                    }}>
                      {getCategoryIcon(selectedCategory?.icon)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                        letterSpacing: -0.1,
                      }}>
                        {v.name}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--text-secondary)', marginTop: 3,
                        lineHeight: 1.3,
                      }}>
                        {v.capacity}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {v.price_per_hour && (
                        <div style={{
                          fontSize: 18, fontWeight: 800, color: catColor,
                          letterSpacing: -0.5,
                        }}>
                          ${v.price_per_hour}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                        {t('common.perHour')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky bottom: skip or continue */}
        <StickyBottom>
          {selectedVehicle ? (
            <Button block type="primary" onClick={() => setStep(2)}
              style={{
                height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700,
                background: 'var(--fab-gradient)', border: 'none',
                boxShadow: '0 4px 14px rgba(0,184,86,0.3)',
                letterSpacing: -0.2,
              }}>
              {t('common.continue')} →
            </Button>
          ) : (
            <Button block onClick={skipVehicle}
              style={{
                height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700,
                background: 'var(--fab-gradient)', border: 'none',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(0,184,86,0.3)',
                letterSpacing: -0.2,
              }}>
              ✨ {t('newOrder.skipChoose')}
            </Button>
          )}
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
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${selectedCategory?.color || 'var(--accent)'}14`,
              padding: '5px 12px', borderRadius: 10,
              fontSize: 12, color: selectedCategory?.color || 'var(--accent)', fontWeight: 600,
            }}>
              {getCategoryIcon(selectedCategory?.icon)}
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCategory?.name}
              </span>
            </div>
          }
        />
        <StepIndicator current={2} labels={stepLabels} />

        <div style={{ padding: '8px 20px 24px' }}>
          <Form form={form} layout="vertical" requiredMark={false}
            initialValues={{ urgency: 'normal', selected_category: selectedCategory?.id }}>

            <SectionLabel text={t('newOrder.whatDone')} />
            <Form.Item name="description" rules={[{ required: true, message: t('newOrder.describeJob') }]}>
              <TextArea rows={3} placeholder={t('newOrder.describeNeed')} onBlur={handleDescriptionBlur}
                style={{ borderRadius: 14, fontSize: 15, padding: '12px 14px' }} />
            </Form.Item>

            {suggestion && (
              <div style={{
                background: 'var(--accent-bg)', borderRadius: 14, padding: '12px 14px',
                marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid var(--accent-bg-strong)',
                animation: 'fadeInUp 0.3s ease-out both',
              }}>
                <BulbOutlined style={{ color: 'var(--accent)', fontSize: 18 }} />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>
                  {t('newOrder.suggested')} <strong>{suggestion.name}</strong>
                </div>
                <Button size="small" type="link" onClick={applySuggestion}
                  style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {t('common.apply')}
                </Button>
                <CloseOutlined onClick={() => setSuggestion(null)}
                  style={{ color: 'var(--text-tertiary)', fontSize: 12, cursor: 'pointer' }} />
              </div>
            )}

            <Form.Item name="cargo_details">
              <TextArea rows={2} placeholder={t('newOrder.cargoDetails')}
                style={{ borderRadius: 14, fontSize: 15, padding: '12px 14px' }} />
            </Form.Item>
            <Form.Item name="urgency">
              <Select options={[
                { value: 'low', label: t('urgency.low') },
                { value: 'normal', label: t('urgency.normal') },
                { value: 'high', label: t('urgency.high') },
                { value: 'urgent', label: t('urgency.urgent') },
              ]} style={{ width: '100%' }} size="large" />
            </Form.Item>

            {/* Location section */}
            <SectionLabel text={needsDest ? t('newOrder.fromTo') : t('newOrder.workLocation')} />

            <Form.Item name="pickup_location" rules={[{ required: true, message: needsDest ? t('newOrder.enterPickup') : t('newOrder.enterWork') }]}>
              <Input
                prefix={<EnvironmentOutlined style={{ color: needsDest ? 'var(--success-color)' : 'var(--accent)' }} />}
                placeholder={needsDest ? t('newOrder.pickupFrom') : t('newOrder.workSiteAddress')}
                style={inputStyle}
                suffix={
                  <span onClick={() => setShowPickupMap(!showPickupMap)}
                    style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {showPickupMap ? t('newOrder.hide') : t('newOrder.map')}
                  </span>
                }
              />
            </Form.Item>
            {showPickupMap && (
              <div style={{ marginBottom: 16, marginTop: -8, borderRadius: 14, overflow: 'hidden' }}>
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
                    prefix={<EnvironmentOutlined style={{ color: '#ef4444' }} />}
                    placeholder={t('newOrder.destinationTo')}
                    style={inputStyle}
                    suffix={
                      <span onClick={() => setShowDestMap(!showDestMap)}
                        style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {showDestMap ? t('newOrder.hide') : t('newOrder.map')}
                      </span>
                    }
                  />
                </Form.Item>
                {showDestMap && (
                  <div style={{ marginBottom: 16, marginTop: -8, borderRadius: 14, overflow: 'hidden' }}>
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
              <Input prefix={<UserOutlined style={{ color: 'var(--text-placeholder)' }} />} placeholder={t('newOrder.fullName')} autoComplete="name" style={inputStyle} />
            </Form.Item>
            <Form.Item name="contact_phone" rules={[{ required: true, message: t('newOrder.enterPhone') }]}>
              <Input prefix={<PhoneOutlined style={{ color: 'var(--text-placeholder)' }} />} placeholder={t('auth.phone')} inputMode="tel" autoComplete="tel" style={inputStyle} />
            </Form.Item>

            <SectionLabel text={t('newOrder.additional')} />
            <Form.Item name="user_note">
              <TextArea rows={2} placeholder={t('newOrder.notesForUs')}
                style={{ borderRadius: 14, fontSize: 15, padding: '12px 14px' }} />
            </Form.Item>
            <Form.Item>
              <Upload listType="picture" fileList={fileList} onChange={({ fileList: fl }) => setFileList(fl)}
                beforeUpload={() => false} multiple accept="image/*">
                <Button icon={<CameraOutlined />}
                  style={{
                    borderRadius: 12, height: 46,
                    border: '1px dashed var(--border-color)',
                    color: 'var(--text-secondary)', fontWeight: 500,
                  }}>
                  {t('newOrder.addPhotos')}
                </Button>
              </Upload>
            </Form.Item>
          </Form>
        </div>

        <StickyBottom>
          <Button type="primary" block onClick={goToConfirm}
            style={{
              height: 52, borderRadius: 14, fontSize: 16, fontWeight: 600,
              background: 'var(--fab-gradient)', border: 'none',
              boxShadow: 'var(--fab-shadow)',
            }}>
            {t('newOrder.reviewOrder')}
          </Button>
        </StickyBottom>
      </div>
    );
  }

  // ─── STEP 3: CONFIRM ───
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }} className="app-bg">
      <AppHeader title={t('newOrder.confirmOrder')} onBack={() => setStep(2)} />
      <StepIndicator current={3} labels={stepLabels} />
      <div style={{ padding: '8px 20px 24px' }}>
        {/* Confirm header */}
        <div style={{
          textAlign: 'center', marginBottom: 20,
          animation: 'fadeInUp 0.4s ease-out both',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--accent-bg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'var(--accent)', marginBottom: 10,
          }}>
            <CheckCircleOutlined />
          </div>
          <div style={{
            fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: -0.2,
          }}>
            {t('newOrder.confirmOrder')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {t('newOrder.reviewOrder')}
          </div>
        </div>

        <ConfirmCard delay={0.05}>
          <ConfirmRow label={t('newOrder.serviceType')} value={selectedCategory?.name} />
          {selectedVehicle && <ConfirmRow label={t('newOrder.vehicle')} value={`${selectedVehicle.name} \u2014 $${selectedVehicle.price_per_hour}/hr`} />}
          <ConfirmRow label={t('adminOrders.urgencyLabel')} value={t('urgency.' + (formValues.urgency || 'normal'))} />
        </ConfirmCard>

        <ConfirmCard delay={0.1}>
          <ConfirmRow label={t('orders.description')} value={formValues.description} />
          {formValues.cargo_details && <ConfirmRow label={t('newOrder.cargoDetails')} value={formValues.cargo_details} />}
        </ConfirmCard>

        <ConfirmCard delay={0.15}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: needsDest ? '#10b98114' : 'var(--accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <EnvironmentOutlined style={{
                color: needsDest ? 'var(--success-color)' : 'var(--accent)',
                fontSize: 13,
              }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {needsDest ? t('orders.pickup') : t('orders.location')}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 1 }}>
                {formValues.pickup_location}
              </div>
            </div>
          </div>
          {needsDest && formValues.destination_location && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#ef444414',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <EnvironmentOutlined style={{ color: '#ef4444', fontSize: 13 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {t('orders.destination')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 1 }}>
                  {formValues.destination_location}
                </div>
              </div>
            </div>
          )}
        </ConfirmCard>

        <ConfirmCard delay={0.2}>
          <ConfirmRow label={t('orders.date')} value={formValues.requested_date?.format('DD MMM YYYY')} />
          {formValues.requested_time && <ConfirmRow label={t('orders.time')} value={formValues.requested_time?.format('HH:mm')} />}
        </ConfirmCard>

        <ConfirmCard delay={0.25}>
          <ConfirmRow label={t('orders.contact')} value={formValues.contact_name} />
          <ConfirmRow label={t('auth.phone')} value={formValues.contact_phone} />
        </ConfirmCard>

        {fileList.length > 0 && (
          <ConfirmCard delay={0.3}>
            <ConfirmRow label={t('orders.photos')} value={t('newOrder.imagesAttached', { count: fileList.length })} />
          </ConfirmCard>
        )}
        {formValues.user_note && (
          <ConfirmCard delay={0.35}>
            <ConfirmRow label={t('newOrder.notes')} value={formValues.user_note} />
          </ConfirmCard>
        )}
      </div>

      <StickyBottom>
        <Button type="primary" block onClick={handleSubmit} loading={loading} icon={<CheckCircleOutlined />}
          style={{
            height: 54, borderRadius: 14, fontSize: 16, fontWeight: 700,
            background: 'var(--fab-gradient)', border: 'none',
            boxShadow: 'var(--fab-shadow)',
            letterSpacing: -0.2,
          }}>
          {t('newOrder.submitOrder')}
        </Button>
      </StickyBottom>
    </div>
  );
}


// ─── Shared components ───

function StepIndicator({ current, labels }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '14px 20px 6px',
      gap: 0,
    }}>
      {labels.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              flex: 0, minWidth: 0,
            }}>
              <div style={{
                width: isActive ? 28 : 22,
                height: isActive ? 28 : 22,
                borderRadius: '50%',
                background: isDone
                  ? 'var(--accent)'
                  : isActive
                  ? 'var(--accent)'
                  : 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                boxShadow: isActive ? '0 0 0 4px var(--accent-bg)' : 'none',
                border: !isDone && !isActive ? '2px solid var(--border-color)' : 'none',
              }}>
                {isDone ? (
                  <CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />
                ) : isActive ? (
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                ) : (
                  <span style={{ color: 'var(--text-placeholder)', fontSize: 10, fontWeight: 600 }}>{i + 1}</span>
                )}
              </div>
              <div style={{
                fontSize: 9, marginTop: 4, textAlign: 'center',
                fontWeight: isActive ? 700 : isDone ? 500 : 400,
                color: isActive ? 'var(--accent)' : isDone ? 'var(--text-primary)' : 'var(--text-placeholder)',
                whiteSpace: 'nowrap',
                maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {label}
              </div>
            </div>
            {i < labels.length - 1 && (
              <div style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < current ? 'var(--accent)' : 'var(--bg-tertiary)',
                transition: 'background 0.3s ease',
                marginBottom: 16,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function AppHeader({ title, onBack, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid var(--glass-border)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div onClick={onBack} style={{
        width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)', WebkitTapHighlightColor: 'transparent',
        background: 'var(--bg-tertiary)',
        transition: 'all 0.2s ease',
      }}>
        <ArrowLeftOutlined />
      </div>
      <div style={{
        flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
        letterSpacing: -0.2,
      }}>
        {title}
      </div>
      {right}
    </div>
  );
}

function StickyBottom({ children }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '12px 20px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--glass-border)',
      zIndex: 99, maxWidth: 800, margin: '0 auto',
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
      marginBottom: 12, marginTop: 12,
      letterSpacing: -0.1,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        width: 3, height: 14, borderRadius: 2,
        background: 'var(--accent)',
      }} />
      {text}
    </div>
  );
}

function ConfirmCard({ children, delay = 0 }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 16, padding: '16px 16px',
      marginBottom: 10, boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-color)',
      animation: `fadeInUp 0.4s ease-out ${delay}s both`,
    }}>
      {children}
    </div>
  );
}

function ConfirmRow({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2,
        fontWeight: 500, letterSpacing: 0.1,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5,
        fontWeight: 500,
      }}>
        {value || '\u2014'}
      </div>
    </div>
  );
}
