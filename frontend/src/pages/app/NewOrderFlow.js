import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Form, Input, Button, Select, DatePicker, TimePicker, Upload, message, Spin, Grid } from 'antd';
import {
  ArrowLeftOutlined, EnvironmentOutlined,
  CalendarOutlined, UserOutlined, PhoneOutlined, CameraOutlined,
  CheckCircleOutlined, BulbOutlined, CloseOutlined, SearchOutlined,
  SwapRightOutlined, ClockCircleOutlined, InboxOutlined,
  PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useLang } from '../../contexts/LanguageContext';
import { getCategoryIcon } from '../../utils/categoryIcons';
import MapPicker from '../../components/map/MapPicker';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';

const { TextArea } = Input;
const { useBreakpoint } = Grid;

export default function NewOrderFlow() {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const { t } = useLang();
  const screens = useBreakpoint();
  const isDesktop = screens.md;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Two steps: 0=form, 1=confirm
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [catSearch, setCatSearch] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Multi-stop route state
  const [pickupStops, setPickupStops] = useState([{ text: '', coords: null }]);
  const [destStops, setDestStops] = useState([{ text: '', coords: null }]);
  const [activeStop, setActiveStop] = useState({ type: 'pickup', index: 0 });
  const [totalDistance, setTotalDistance] = useState(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const distanceTimerRef = useRef(null);

  const needsDest = selectedCategory?.requires_destination;

  // Pre-fill from landing page
  useEffect(() => {
    const state = location.state;
    if (state) {
      if (state.pickup) {
        const text = state.pickup.text || state.pickup.address || '';
        const coords = (state.pickup.lat && state.pickup.lng) ? { lat: state.pickup.lat, lng: state.pickup.lng } : null;
        form.setFieldsValue({ pickup_location: text });
        setPickupStops([{ text, coords }]);
      }
      if (state.destination) {
        const text = state.destination.text || state.destination.address || '';
        const coords = (state.destination.lat && state.destination.lng) ? { lat: state.destination.lat, lng: state.destination.lng } : null;
        form.setFieldsValue({ destination_location: text });
        setDestStops([{ text, coords }]);
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
        }
      }
    });
  }, [searchParams]); // eslint-disable-line

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    form.setFieldsValue({
      selected_category: cat.id,
      contact_name: form.getFieldValue('contact_name') || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      contact_phone: form.getFieldValue('contact_phone') || user?.phone_number || '',
    });
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
    if (!selectedCategory) {
      message.warning(t('newOrder.pleaseSelectCategory'));
      return;
    }
    try {
      const values = await form.validateFields();
      setFormValues(values);
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { /* validation errors shown */ }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = formValues;
      const fd = new FormData();
      if (selectedCategory.id !== 'admin_decide') {
        fd.append('selected_category', selectedCategory.id);
      }
      // Primary pickup (first stop)
      fd.append('pickup_location', pickupStops[0]?.text || values.pickup_location);
      if (pickupStops[0]?.coords) {
        fd.append('pickup_lat', pickupStops[0].coords.lat);
        fd.append('pickup_lng', pickupStops[0].coords.lng);
      }
      // Primary destination (first stop)
      fd.append('destination_location', destStops[0]?.text || values.destination_location || '');
      if (destStops[0]?.coords) {
        fd.append('destination_lat', destStops[0].coords.lat);
        fd.append('destination_lng', destStops[0].coords.lng);
      }
      // All stops as JSON
      const routeStopsData = {
        pickups: pickupStops.filter(s => s.text).map(s => ({
          address: s.text,
          lat: s.coords?.lat || null,
          lng: s.coords?.lng || null,
        })),
        destinations: destStops.filter(s => s.text).map(s => ({
          address: s.text,
          lat: s.coords?.lat || null,
          lng: s.coords?.lng || null,
        })),
        distance: totalDistance?.distance || null,
        duration: totalDistance?.duration || null,
      };
      fd.append('route_stops', JSON.stringify(routeStopsData));
      fd.append('requested_date', values.requested_date.format('YYYY-MM-DD'));
      if (values.requested_time) fd.append('requested_time', values.requested_time.format('HH:mm'));
      fd.append('contact_name', values.contact_name);
      fd.append('contact_phone', values.contact_phone);
      fd.append('description', values.description);
      const cargoParts = [];
      if (values.cargo_length || values.cargo_width || values.cargo_height) {
        cargoParts.push(`${values.cargo_length || '-'} × ${values.cargo_width || '-'} × ${values.cargo_height || '-'} cm`);
      }
      if (values.cargo_weight) cargoParts.push(`${values.cargo_weight} kg`);
      fd.append('cargo_details', cargoParts.join(', '));
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

  // ── Multi-stop helpers ──
  const updateStop = (type, index, updates) => {
    const setter = type === 'pickup' ? setPickupStops : setDestStops;
    setter(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
    // Sync first stop with form fields for validation
    if (index === 0 && updates.text !== undefined) {
      const field = type === 'pickup' ? 'pickup_location' : 'destination_location';
      form.setFieldsValue({ [field]: updates.text });
    }
  };

  const addStop = (type) => {
    const setter = type === 'pickup' ? setPickupStops : setDestStops;
    setter(prev => [...prev, { text: '', coords: null }]);
    const list = type === 'pickup' ? pickupStops : destStops;
    setActiveStop({ type, index: list.length });
  };

  const removeStop = (type, index) => {
    const setter = type === 'pickup' ? setPickupStops : setDestStops;
    setter(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [{ text: '', coords: null }] : next;
    });
    // Fix active stop index
    if (activeStop.type === type) {
      if (activeStop.index >= index && activeStop.index > 0) {
        setActiveStop({ type, index: activeStop.index - 1 });
      }
    }
    // Re-sync first stop with form
    if (index === 0) {
      const list = type === 'pickup' ? pickupStops : destStops;
      const newFirst = list[1] || { text: '' };
      const field = type === 'pickup' ? 'pickup_location' : 'destination_location';
      form.setFieldsValue({ [field]: newFirst.text });
    }
  };

  // ── Distance calculation via OSRM ──
  const calculateDistance = useCallback(async () => {
    const allStops = [
      ...pickupStops.filter(s => s.coords),
      ...destStops.filter(s => s.coords),
    ];
    if (allStops.length < 2) {
      setTotalDistance(null);
      return;
    }
    setDistanceLoading(true);
    try {
      const coords = allStops.map(s => `${s.coords.lng},${s.coords.lat}`).join(';');
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`
      );
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]) {
        setTotalDistance({
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
        });
      } else {
        setTotalDistance(null);
      }
    } catch {
      setTotalDistance(null);
    } finally {
      setDistanceLoading(false);
    }
  }, [pickupStops, destStops]);

  // Recalculate distance when stops change (debounced)
  useEffect(() => {
    if (distanceTimerRef.current) clearTimeout(distanceTimerRef.current);
    distanceTimerRef.current = setTimeout(calculateDistance, 800);
    return () => clearTimeout(distanceTimerRef.current);
  }, [calculateDistance]);

  // Active stop helpers for map
  const activeStopData = activeStop.type === 'pickup'
    ? pickupStops[activeStop.index]
    : destStops[activeStop.index];
  const activePosition = activeStopData?.coords
    ? [activeStopData.coords.lat, activeStopData.coords.lng]
    : null;

  // Build extra markers for map (all stops except the active one)
  const extraMarkers = [
    ...pickupStops.map((s, i) => ({ stop: s, color: 'green', type: 'pickup', index: i })),
    ...destStops.filter(() => needsDest).map((s, i) => ({ stop: s, color: 'red', type: 'dest', index: i })),
  ]
    .filter(m => m.stop.coords && !(m.type === activeStop.type && m.index === activeStop.index))
    .map(m => ({ position: [m.stop.coords.lat, m.stop.coords.lng], color: m.color }));

  const formatDistance = (meters) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} ${t('newOrder.km')}`;
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds) => {
    if (seconds >= 3600) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.round((seconds % 3600) / 60);
      return `${hrs} ${t('newOrder.hr')} ${mins} ${t('newOrder.min')}`;
    }
    return `${Math.round(seconds / 60)} ${t('newOrder.min')}`;
  };

  const filteredCategories = categories.filter(
    (c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()) || c.description?.toLowerCase().includes(catSearch.toLowerCase())
  );

  const inputStyle = { height: 50, borderRadius: 14, fontSize: 15 };

  // ─── STEP 0: SINGLE-PAGE ORDER FORM ───
  if (step === 0) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 100 }} className="app-bg">
        {/* Header */}
        <div style={{
          background: 'var(--header-gradient)',
          padding: '0 0 28px',
          borderRadius: '0 0 24px 24px',
          position: 'relative',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
          }}>
            <div onClick={() => navigate('/app')} style={{
              width: 38, height: 38, borderRadius: 12, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16, color: '#fff',
              background: 'rgba(255,255,255,0.18)',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <ArrowLeftOutlined />
            </div>
            <div style={{ flex: 1, fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>
              {t('nav.newOrder')}
            </div>
          </div>

          {/* Step indicator - minimal */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 24px', marginTop: 4,
          }}>
            <StepPill active label={`1. ${t('newOrder.orderDetails')}`} />
            <div style={{ width: 20, height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
            <StepPill label={`2. ${t('newOrder.confirmOrder')}`} />
          </div>
        </div>

        <Form form={form} layout="vertical" requiredMark={false}
          initialValues={{ selected_category: selectedCategory?.id }}>

          {/* ── SECTION: Transport Type (Category pills) ── */}
          <FormSection
            icon={<InboxOutlined />}
            title={t('newOrder.selectService')}
            subtitle={t('newOrder.whatService')}
            first
          >
            {/* Search bar for categories */}
            {categories.length > 6 && (
              <Input
                prefix={<SearchOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('newOrder.searchService')}
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                allowClear
                style={{
                  marginBottom: 12, borderRadius: 12, height: 42,
                  background: 'var(--input-bg)', fontSize: 14,
                }}
              />
            )}

            {/* Category pills — single row scroll, expand on "Show All" */}
            <div style={{
              display: 'flex',
              flexWrap: showAllCategories ? 'wrap' : 'nowrap',
              gap: 8,
              overflowX: showAllCategories ? 'visible' : 'auto',
              paddingBottom: showAllCategories ? 0 : 4,
              scrollSnapType: showAllCategories ? 'none' : 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none', scrollbarWidth: 'none',
            }}>
              {/* "Not sure" option — let admin decide */}
              {!catSearch && (() => {
                const isActive = selectedCategory?.id === 'admin_decide';
                return (
                  <div
                    onClick={() => {
                      setSelectedCategory({ id: 'admin_decide', name: t('newOrder.adminWillDecide'), icon: 'question', color: 'var(--text-tertiary)', requires_destination: true });
                      form.setFieldsValue({
                        selected_category: null,
                        contact_name: form.getFieldValue('contact_name') || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
                        contact_phone: form.getFieldValue('contact_phone') || user?.phone_number || '',
                      });
                    }}
                    className="card-interactive"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 14, cursor: 'pointer',
                      flexShrink: 0, scrollSnapAlign: 'start',
                      background: isActive ? 'var(--accent-bg)' : 'var(--card-bg)',
                      border: isActive ? '2px solid var(--accent)' : '1px dashed var(--border-color)',
                      boxShadow: isActive ? '0 0 0 3px var(--accent-bg)' : 'none',
                      transition: 'all 0.2s ease',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: isActive ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                    }}>?</div>
                    <div style={{
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      lineHeight: 1.2, whiteSpace: 'nowrap',
                    }}>
                      {t('newOrder.notSure')}
                    </div>
                  </div>
                );
              })()}
              {(showAllCategories ? filteredCategories : filteredCategories).map((cat) => {
                const isActive = selectedCategory?.id === cat.id;
                const color = cat.color || 'var(--accent)';
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className="card-interactive"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderRadius: 14, cursor: 'pointer',
                      flexShrink: 0, scrollSnapAlign: 'start',
                      background: isActive ? `${color}14` : 'var(--card-bg)',
                      border: isActive ? `2px solid ${color}` : '1px solid var(--border-color)',
                      boxShadow: isActive ? `0 0 0 3px ${color}10` : 'var(--shadow-xs)',
                      transition: 'all 0.2s ease',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: isActive ? `${color}20` : `${color}0a`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: isActive ? color : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                    }}>
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: isActive ? 700 : 500,
                        color: isActive ? color : 'var(--text-primary)',
                        lineHeight: 1.2, whiteSpace: showAllCategories ? 'normal' : 'nowrap',
                      }}>
                        {cat.name}
                      </div>
                      {cat.requires_destination && (
                        <div style={{
                          fontSize: 10, color: 'var(--text-tertiary)',
                          display: 'flex', alignItems: 'center', gap: 2, marginTop: 2,
                        }}>
                          <SwapRightOutlined style={{ fontSize: 10 }} /> {t('newOrder.transportBadge')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredCategories.length > 4 && (
              <div
                onClick={() => setShowAllCategories(!showAllCategories)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginTop: 10, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--bg-tertiary)',
                  fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                  transition: 'background 0.2s',
                }}
              >
                {showAllCategories ? t('newOrder.showLess') : `${t('newOrder.showAll')} (${filteredCategories.length})`}
              </div>
            )}
          </FormSection>

          {/* ── SECTION: Route (Multi-stop Origin / Destination) ── */}
          <FormSection
            icon={<EnvironmentOutlined />}
            title={needsDest ? t('newOrder.fromTo') : t('newOrder.workLocation')}
          >
            <div style={{
              display: isDesktop ? 'flex' : 'block',
              gap: isDesktop ? 20 : 0,
              alignItems: 'stretch',
            }}>
            {/* Left column: Location inputs + distance */}
            <div style={{ flex: isDesktop ? 1 : undefined, minWidth: 0 }}>
            {/* Location inputs card */}
            <div style={{
              background: 'var(--card-bg)', borderRadius: 16,
              padding: isDesktop ? 20 : 16,
              border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)',
              marginBottom: 12,
            }}>
              {/* ── Pickup stops ── */}
              {pickupStops.map((stop, idx) => (
                <div key={`pickup-${idx}`}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: activeStop.type === 'pickup' && activeStop.index === idx
                        ? 'var(--accent-bg)' : 'transparent',
                      borderRadius: 10, padding: '2px 0',
                      transition: 'background 0.2s ease',
                    }}
                    onClick={() => setActiveStop({ type: 'pickup', index: idx })}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: needsDest ? 'var(--success-color)' : 'var(--accent)',
                      flexShrink: 0,
                      boxShadow: `0 0 0 3px ${needsDest ? '#10b98120' : 'var(--accent-bg)'}`,
                    }} />
                    {idx === 0 ? (
                      <Form.Item name="pickup_location" style={{ flex: 1, marginBottom: 0 }}
                        rules={[{ required: true, message: needsDest ? t('newOrder.enterPickup') : t('newOrder.enterWork') }]}>
                        <LocationAutocomplete
                          value={stop.text}
                          onChange={(val) => updateStop('pickup', idx, { text: val })}
                          onSelect={({ address, lat, lng }) => {
                            updateStop('pickup', idx, { text: address, coords: { lat, lng } });
                          }}
                          placeholder={needsDest
                            ? (pickupStops.length > 1 ? `${t('newOrder.pickupFrom')} #${idx + 1}` : t('newOrder.pickupFrom'))
                            : t('newOrder.workSiteAddress')}
                          prefix={null}
                          countryCode="ge"
                          style={{ flex: 1 }}
                        />
                      </Form.Item>
                    ) : (
                      <LocationAutocomplete
                        value={stop.text}
                        onChange={(val) => updateStop('pickup', idx, { text: val })}
                        onSelect={({ address, lat, lng }) => {
                          updateStop('pickup', idx, { text: address, coords: { lat, lng } });
                        }}
                        placeholder={`${t('newOrder.pickupFrom')} #${idx + 1}`}
                        prefix={null}
                        countryCode="ge"
                        style={{ flex: 1 }}
                      />
                    )}
                    {pickupStops.length > 1 && (
                      <div
                        onClick={(e) => { e.stopPropagation(); removeStop('pickup', idx); }}
                        style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--text-tertiary)',
                          background: 'var(--bg-tertiary)', transition: 'all 0.15s ease',
                        }}
                      >
                        <DeleteOutlined style={{ fontSize: 12 }} />
                      </div>
                    )}
                  </div>
                  {/* Dashed connector */}
                  {(idx < pickupStops.length - 1 || needsDest) && (
                    <div style={{ paddingLeft: 3, margin: '2px 0' }}>
                      <div style={{
                        width: 4, height: idx < pickupStops.length - 1 ? 16 : 24,
                        borderLeft: '2px dashed var(--border-color)',
                        marginLeft: 2,
                      }} />
                    </div>
                  )}
                </div>
              ))}

              {/* Add pickup button */}
              <div
                onClick={() => addStop('pickup')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 0 4px', cursor: 'pointer',
                  color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                  marginLeft: 20,
                }}
              >
                <PlusOutlined style={{ fontSize: 11 }} />
                {t('newOrder.addPickupStop')}
              </div>

              {/* ── Separator between pickup and destination ── */}
              {needsDest && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  margin: '8px 0', paddingLeft: 3,
                }}>
                  <SwapRightOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
                  <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                </div>
              )}

              {/* ── Destination stops ── */}
              {needsDest && destStops.map((stop, idx) => (
                <div key={`dest-${idx}`}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: activeStop.type === 'dest' && activeStop.index === idx
                        ? '#ef44440a' : 'transparent',
                      borderRadius: 10, padding: '2px 0',
                      transition: 'background 0.2s ease',
                    }}
                    onClick={() => setActiveStop({ type: 'dest', index: idx })}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#ef4444', flexShrink: 0,
                      boxShadow: '0 0 0 3px #ef444420',
                    }} />
                    {idx === 0 ? (
                      <Form.Item name="destination_location" style={{ flex: 1, marginBottom: 0 }}
                        rules={[{ required: true, message: t('newOrder.enterDestination') }]}>
                        <LocationAutocomplete
                          value={stop.text}
                          onChange={(val) => updateStop('dest', idx, { text: val })}
                          onSelect={({ address, lat, lng }) => {
                            updateStop('dest', idx, { text: address, coords: { lat, lng } });
                          }}
                          placeholder={destStops.length > 1 ? `${t('newOrder.destinationTo')} #${idx + 1}` : t('newOrder.destinationTo')}
                          prefix={null}
                          countryCode="ge"
                          style={{ flex: 1 }}
                        />
                      </Form.Item>
                    ) : (
                      <LocationAutocomplete
                        value={stop.text}
                        onChange={(val) => updateStop('dest', idx, { text: val })}
                        onSelect={({ address, lat, lng }) => {
                          updateStop('dest', idx, { text: address, coords: { lat, lng } });
                        }}
                        placeholder={`${t('newOrder.destinationTo')} #${idx + 1}`}
                        prefix={null}
                        countryCode="ge"
                        style={{ flex: 1 }}
                      />
                    )}
                    {destStops.length > 1 && (
                      <div
                        onClick={(e) => { e.stopPropagation(); removeStop('dest', idx); }}
                        style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--text-tertiary)',
                          background: 'var(--bg-tertiary)', transition: 'all 0.15s ease',
                        }}
                      >
                        <DeleteOutlined style={{ fontSize: 12 }} />
                      </div>
                    )}
                  </div>
                  {/* Dashed connector between dest stops */}
                  {idx < destStops.length - 1 && (
                    <div style={{ paddingLeft: 3, margin: '2px 0' }}>
                      <div style={{
                        width: 4, height: 16,
                        borderLeft: '2px dashed #ef444440',
                        marginLeft: 2,
                      }} />
                    </div>
                  )}
                </div>
              ))}

              {/* Add destination button */}
              {needsDest && (
                <div
                  onClick={() => addStop('dest')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 0 4px', cursor: 'pointer',
                    color: '#ef4444', fontSize: 12, fontWeight: 600,
                    marginLeft: 20,
                  }}
                >
                  <PlusOutlined style={{ fontSize: 11 }} />
                  {t('newOrder.addDestStop')}
                </div>
              )}
            </div>

            {/* ── Distance display ── */}
            {totalDistance && (
              <div style={{
                background: 'var(--accent-bg)', borderRadius: 12, padding: '10px 14px',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
                border: '1px solid var(--accent-bg-strong)',
                animation: 'fadeInUp 0.3s ease-out both',
              }}>
                <SwapRightOutlined style={{ color: 'var(--accent)', fontSize: 16 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatDistance(totalDistance.distance)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    ~ {formatDuration(totalDistance.duration)}
                  </div>
                </div>
                {distanceLoading && <Spin size="small" />}
              </div>
            )}
            {distanceLoading && !totalDistance && (
              <div style={{
                textAlign: 'center', padding: '8px 0', fontSize: 12,
                color: 'var(--text-tertiary)',
              }}>
                <Spin size="small" style={{ marginRight: 8 }} />
                {t('newOrder.calculating')}
              </div>
            )}

            {/* Inline Date & Time — shown in left column on desktop when short (no dest, single stop) */}
            {isDesktop && !needsDest && pickupStops.length <= 1 && (
              <div style={{
                background: 'var(--card-bg)', borderRadius: 16, padding: 20,
                border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)',
                marginTop: 4,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--accent-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: 'var(--accent)',
                  }}>
                    <CalendarOutlined />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.2 }}>
                    {t('newOrder.when')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Form.Item name="requested_date" style={{ flex: 1, marginBottom: 0 }}
                    rules={[{ required: true, message: t('newOrder.selectDate') }]}>
                    <DatePicker
                      style={{ width: '100%', height: 46, borderRadius: 12, fontSize: 14 }}
                      placeholder={t('newOrder.selectDate')}
                      disabledDate={(d) => d && d < dayjs().startOf('day')}
                      inputReadOnly suffixIcon={<CalendarOutlined />}
                    />
                  </Form.Item>
                  <Form.Item name="requested_time" style={{ flex: 1, marginBottom: 0 }}>
                    <TimePicker
                      format="HH:mm"
                      style={{ width: '100%', height: 46, borderRadius: 12, fontSize: 14 }}
                      placeholder={t('newOrder.preferredTime')}
                      inputReadOnly suffixIcon={<ClockCircleOutlined />}
                    />
                  </Form.Item>
                </div>
              </div>
            )}
            </div>{/* end left column */}

            {/* Right column: Map */}
            <div style={{
              flex: isDesktop ? 1 : undefined,
              minWidth: 0,
              position: isDesktop ? 'sticky' : 'static',
              top: isDesktop ? 20 : undefined,
              alignSelf: isDesktop ? 'flex-start' : undefined,
              background: isDesktop ? 'var(--card-bg)' : 'transparent',
              borderRadius: isDesktop ? 16 : 0,
              padding: isDesktop ? 16 : 0,
              border: isDesktop ? '1px solid var(--border-color)' : 'none',
              boxShadow: isDesktop ? 'var(--shadow-sm)' : 'none',
            }}>
            {/* ── Map tab pills ── */}
            <div style={{
              display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap',
            }}>
              {pickupStops.map((_, idx) => (
                <button
                  key={`pickup-tab-${idx}`}
                  onClick={() => setActiveStop({ type: 'pickup', index: idx })}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: activeStop.type === 'pickup' && activeStop.index === idx
                      ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: activeStop.type === 'pickup' && activeStop.index === idx
                      ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <EnvironmentOutlined style={{ marginRight: 3, fontSize: 10 }} />
                  {needsDest
                    ? (pickupStops.length > 1 ? `${t('newOrder.pickupMap')} ${idx + 1}` : t('newOrder.pickupMap'))
                    : (pickupStops.length > 1 ? `${t('newOrder.locationMap')} ${idx + 1}` : t('newOrder.locationMap'))
                  }
                </button>
              ))}
              {needsDest && destStops.map((_, idx) => (
                <button
                  key={`dest-tab-${idx}`}
                  onClick={() => setActiveStop({ type: 'dest', index: idx })}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: activeStop.type === 'dest' && activeStop.index === idx
                      ? '#ef4444' : 'var(--bg-tertiary)',
                    color: activeStop.type === 'dest' && activeStop.index === idx
                      ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <EnvironmentOutlined style={{ marginRight: 3, fontSize: 10 }} />
                  {destStops.length > 1 ? `${t('newOrder.destinationMap')} ${idx + 1}` : t('newOrder.destinationMap')}
                </button>
              ))}
            </div>

            <div style={{
              borderRadius: isDesktop ? 12 : 14,
              overflow: 'hidden',
              border: isDesktop ? 'none' : '1px solid var(--border-color)',
            }}>
              <MapPicker
                position={activePosition}
                onSelect={({ lat, lng, address }) => {
                  updateStop(activeStop.type === 'dest' ? 'dest' : 'pickup', activeStop.index, {
                    text: address,
                    coords: { lat, lng },
                  });
                }}
                height={isDesktop ? 340 : 220}
                markerColor={activeStop.type === 'dest' ? 'red' : 'green'}
                placeholder={
                  activeStop.type === 'dest'
                    ? t('newOrder.tapDestination')
                    : (needsDest ? t('newOrder.tapPickup') : t('newOrder.tapLocation'))
                }
                extraMarkers={extraMarkers}
              />
            </div>
            </div>{/* end right column */}
            </div>{/* end flex row */}
          </FormSection>

          {/* ── SECTION: Date & Time (standalone — hidden on desktop when inline in left column) ── */}
          {(!isDesktop || needsDest || pickupStops.length > 1) && (
          <FormSection icon={<CalendarOutlined />} title={t('newOrder.when')}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Form.Item name="requested_date" style={{ flex: 1, marginBottom: 0 }}
                rules={[{ required: true, message: t('newOrder.selectDate') }]}>
                <DatePicker
                  style={{ width: '100%', height: 50, borderRadius: 14, fontSize: 15 }}
                  placeholder={t('newOrder.selectDate')}
                  disabledDate={(d) => d && d < dayjs().startOf('day')}
                  inputReadOnly suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>
              <Form.Item name="requested_time" style={{ flex: 1, marginBottom: 0 }}>
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%', height: 50, borderRadius: 14, fontSize: 15 }}
                  placeholder={t('newOrder.preferredTime')}
                  inputReadOnly suffixIcon={<ClockCircleOutlined />}
                />
              </Form.Item>
            </div>
          </FormSection>
          )}

          {/* ── SECTION: Description & Cargo ── */}
          <FormSection
            icon={<SearchOutlined />}
            title={t('newOrder.whatDone')}
          >
            <Form.Item name="description" rules={[{ required: true, message: t('newOrder.describeJob') }]}
              style={{ marginBottom: 12 }}>
              <TextArea rows={3} placeholder={t('newOrder.describeNeed')} onBlur={handleDescriptionBlur}
                style={{ borderRadius: 14, fontSize: 15, padding: '12px 14px' }} />
            </Form.Item>

            {suggestion && (
              <div style={{
                background: 'var(--accent-bg)', borderRadius: 14, padding: '12px 14px',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
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

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Form.Item name="cargo_length" style={{ flex: 1, marginBottom: 0 }}>
                <Input placeholder={t('newOrder.length')} suffix={t('newOrder.cm')}
                  inputMode="decimal" style={{ borderRadius: 14, fontSize: 15, height: 46 }} />
              </Form.Item>
              <Form.Item name="cargo_width" style={{ flex: 1, marginBottom: 0 }}>
                <Input placeholder={t('newOrder.width')} suffix={t('newOrder.cm')}
                  inputMode="decimal" style={{ borderRadius: 14, fontSize: 15, height: 46 }} />
              </Form.Item>
              <Form.Item name="cargo_height" style={{ flex: 1, marginBottom: 0 }}>
                <Input placeholder={t('newOrder.height')} suffix={t('newOrder.cm')}
                  inputMode="decimal" style={{ borderRadius: 14, fontSize: 15, height: 46 }} />
              </Form.Item>
            </div>
            <Form.Item name="cargo_weight" style={{ marginBottom: 12 }}>
              <Input placeholder={t('newOrder.weight')} suffix={t('newOrder.kg')}
                inputMode="decimal" style={{ borderRadius: 14, fontSize: 15, height: 46 }} />
            </Form.Item>

          </FormSection>

          {/* ── SECTION: Contact ── */}
          <FormSection icon={<UserOutlined />} title={t('newOrder.contactPerson')}
            extra={
              <div
                onClick={() => {
                  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
                  form.setFieldsValue({
                    contact_name: name,
                    contact_phone: user?.phone_number || '',
                  });
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 20,
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: 0.2,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <UserOutlined style={{ fontSize: 11 }} />
                {t('newOrder.fillMe')}
              </div>
            }
          >
            <Form.Item name="contact_name" rules={[{ required: true, message: t('newOrder.enterContact') }]}
              style={{ marginBottom: 12 }}>
              <Input prefix={<UserOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('newOrder.fullName')} autoComplete="name" style={inputStyle} />
            </Form.Item>
            <Form.Item name="contact_phone" rules={[{ required: true, message: t('newOrder.enterPhone') }]}
              style={{ marginBottom: 0 }}>
              <Input prefix={<PhoneOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('auth.phone')} inputMode="tel" autoComplete="tel" style={inputStyle} />
            </Form.Item>
          </FormSection>

          {/* ── SECTION: Additional ── */}
          <FormSection icon={<CameraOutlined />} title={t('newOrder.additional')} last>
            <Form.Item name="user_note" style={{ marginBottom: 12 }}>
              <TextArea rows={2} placeholder={t('newOrder.notesForUs')}
                style={{ borderRadius: 14, fontSize: 15, padding: '12px 14px' }} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
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
          </FormSection>
        </Form>

        {/* Sticky CTA */}
        <StickyBottom>
          <Button type="primary" block onClick={goToConfirm}
            style={{
              height: 54, borderRadius: 14, fontSize: 16, fontWeight: 700,
              background: 'var(--fab-gradient)', border: 'none',
              boxShadow: 'var(--fab-shadow)', letterSpacing: -0.2,
            }}>
            {t('newOrder.reviewOrder')} →
          </Button>
        </StickyBottom>
      </div>
    );
  }

  // ─── STEP 1: CONFIRM ───
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }} className="app-bg">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div onClick={() => setStep(0)} style={{
          width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)', WebkitTapHighlightColor: 'transparent',
          background: 'var(--bg-tertiary)',
        }}>
          <ArrowLeftOutlined />
        </div>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.2 }}>
          {t('newOrder.confirmOrder')}
        </div>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 24px 6px',
      }}>
        <StepPill done label={`1. ${t('newOrder.orderDetails')}`} />
        <div style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 1 }} />
        <StepPill active label={`2. ${t('newOrder.confirmOrder')}`} />
      </div>

      <div style={{ padding: '12px 20px 24px' }}>
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
            fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.2,
          }}>
            {t('newOrder.confirmOrder')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {t('newOrder.reviewOrder')}
          </div>
        </div>

        <ConfirmCard delay={0.05}>
          <ConfirmRow label={t('newOrder.serviceType')} value={selectedCategory?.name} />
        </ConfirmCard>

        <ConfirmCard delay={0.1}>
          <ConfirmRow label={t('orders.description')} value={formValues.description} />
          {(formValues.cargo_length || formValues.cargo_width || formValues.cargo_height) && (
            <ConfirmRow label={t('newOrder.dimensions')} value={`${formValues.cargo_length || '-'} × ${formValues.cargo_width || '-'} × ${formValues.cargo_height || '-'} ${t('newOrder.cm')}`} />
          )}
          {formValues.cargo_weight && (
            <ConfirmRow label={t('newOrder.weight')} value={`${formValues.cargo_weight} ${t('newOrder.kg')}`} />
          )}
        </ConfirmCard>

        <ConfirmCard delay={0.15}>
          {/* All pickup stops */}
          {pickupStops.filter(s => s.text).map((stop, idx) => (
            <div key={`confirm-pickup-${idx}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: needsDest ? '#10b98114' : 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <EnvironmentOutlined style={{
                  color: needsDest ? 'var(--success-color)' : 'var(--accent)', fontSize: 13,
                }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {needsDest
                    ? (pickupStops.filter(s => s.text).length > 1 ? `${t('orders.pickup')} ${idx + 1}` : t('orders.pickup'))
                    : t('orders.location')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 1 }}>
                  {stop.text}
                </div>
              </div>
            </div>
          ))}

          {/* All destination stops */}
          {needsDest && destStops.filter(s => s.text).map((stop, idx) => (
            <div key={`confirm-dest-${idx}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: idx < destStops.filter(s => s.text).length - 1 ? 10 : 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#ef444414',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <EnvironmentOutlined style={{ color: '#ef4444', fontSize: 13 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {destStops.filter(s => s.text).length > 1 ? `${t('orders.destination')} ${idx + 1}` : t('orders.destination')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 1 }}>
                  {stop.text}
                </div>
              </div>
            </div>
          ))}

          {/* Distance */}
          {totalDistance && (
            <div style={{
              marginTop: 12, paddingTop: 10,
              borderTop: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <SwapRightOutlined style={{ color: 'var(--accent)', fontSize: 14 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatDistance(totalDistance.distance)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                ~ {formatDuration(totalDistance.duration)}
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
        <div style={{ marginTop: 20 }}>
          <Button type="primary" block onClick={handleSubmit} loading={loading} icon={<CheckCircleOutlined />}
            style={{
              height: 54, borderRadius: 14, fontSize: 16, fontWeight: 700,
              background: 'var(--fab-gradient)', border: 'none',
              boxShadow: 'var(--fab-shadow)', letterSpacing: -0.2,
            }}>
            {t('newOrder.submitOrder')}
          </Button>
          <Button block onClick={() => setStep(0)}
            style={{
              marginTop: 10, height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
              color: 'var(--text-secondary)', border: 'none', background: 'transparent',
            }}>
            ← {t('newOrder.orderDetails')}
          </Button>
        </div>
      </div>
    </div>
  );
}


// ─── Shared components ───

function StepPill({ active, done, label }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: active ? 700 : done ? 600 : 400,
      color: active ? '#fff' : done ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
      background: active ? 'rgba(255,255,255,0.22)' : done ? 'rgba(255,255,255,0.12)' : 'transparent',
      padding: '6px 14px', borderRadius: 20,
      whiteSpace: 'nowrap',
      transition: 'all 0.3s ease',
      ...(done ? { color: 'var(--accent)', background: 'var(--accent-bg)' } : {}),
    }}>
      {done && <CheckCircleOutlined style={{ marginRight: 4, fontSize: 11 }} />}
      {label}
    </div>
  );
}

function FormSection({ icon, title, subtitle, children, first, last, optionalLabel, extra }) {
  return (
    <div style={{
      padding: first ? '20px 20px 0' : '0 20px',
      marginBottom: last ? 8 : 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12, marginTop: first ? 0 : 20,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: 'var(--accent)',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: -0.2, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {title}
            {optionalLabel && (
              <span style={{
                fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)',
                background: 'var(--badge-muted-bg)', padding: '2px 8px', borderRadius: 6,
              }}>
                {optionalLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}

function StickyBottom({ children }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 99,
    }}>
      <div style={{
        maxWidth: 800, margin: '0 auto',
        padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}>
        {children}
      </div>
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
