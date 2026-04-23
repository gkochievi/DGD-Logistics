import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Form, Input, Button, Select, DatePicker, TimePicker, Upload, message, Spin, Grid } from 'antd';
import {
  ArrowLeftOutlined, EnvironmentOutlined,
  CalendarOutlined, UserOutlined, PhoneOutlined, CameraOutlined,
  CheckCircleOutlined, BulbOutlined, CloseOutlined, SearchOutlined,
  SwapRightOutlined, ClockCircleOutlined, InboxOutlined,
  PlusOutlined, DeleteOutlined, ExpandOutlined,
  FileTextOutlined, CarOutlined, RightOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { useLang } from '../../contexts/LanguageContext';
import { CategoryImage } from '../../utils/categoryIcons';
import MapPicker from '../../components/map/MapPicker';
import LocationAutocomplete from '../../components/common/LocationAutocomplete';

const { TextArea } = Input;
const { useBreakpoint } = Grid;

// Build an AntD TimePicker `disabledTime` callback from the restricted
// windows that apply to the current order, plus a list of human-readable
// rules for the warning banner. A window applies if any pickup,
// destination, or route stop text contains its `location_keyword`
// (case-insensitive substring).
function computeRestrictions(windows, locationTexts) {
  const lowered = locationTexts
    .map((t) => (t || '').toLowerCase())
    .filter(Boolean);

  const applicable = (windows || []).filter((w) => {
    if (!w.is_active) return false;
    const kw = (w.location_keyword || '').toLowerCase().trim();
    if (!kw) return false;
    return lowered.some((txt) => txt.includes(kw));
  });

  if (applicable.length === 0) {
    return { applicable: [], disabledTime: undefined };
  }

  // For each window like 17:00–19:00, mark every minute in [start, end) as
  // blocked. Wrap-around windows (e.g. 22:00–06:00) are split into two
  // ranges. Each minute is one bit in a 1440-entry array.
  const blocked = new Array(24 * 60).fill(false);
  const minutesOf = (hms) => {
    if (!hms) return null;
    const [h, m] = hms.split(':').map(Number);
    return h * 60 + m;
  };
  applicable.forEach((w) => {
    const s = minutesOf(w.start_time);
    const e = minutesOf(w.end_time);
    if (s == null || e == null) return;
    if (s < e) {
      for (let i = s; i < e; i++) blocked[i] = true;
    } else if (s > e) {
      for (let i = s; i < 24 * 60; i++) blocked[i] = true;
      for (let i = 0; i < e; i++) blocked[i] = true;
    }
  });

  const disabledTime = () => ({
    disabledHours: () => {
      const hours = [];
      for (let h = 0; h < 24; h++) {
        let allBlocked = true;
        for (let m = 0; m < 60; m++) {
          if (!blocked[h * 60 + m]) { allBlocked = false; break; }
        }
        if (allBlocked) hours.push(h);
      }
      return hours;
    },
    disabledMinutes: (h) => {
      if (h == null || h < 0) return [];
      const mins = [];
      for (let m = 0; m < 60; m++) {
        if (blocked[h * 60 + m]) mins.push(m);
      }
      return mins;
    },
  });

  return { applicable, disabledTime };
}

export default function NewOrderFlow() {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const { restrictedTimeWindows } = useBranding();
  const localized = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['en'] || '';
  };
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
  const [photoError, setPhotoError] = useState('');
  const [formValues, setFormValues] = useState({});
  const [catSearch, setCatSearch] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showCargo, setShowCargo] = useState(false);

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
    api.get('/services/').then(({ data }) => {
      const svcs = Array.isArray(data) ? data : data.results || [];
      setCategories(svcs);
      // Accept both ?service= (new) and ?category= (legacy deep links).
      const svcId = searchParams.get('service') || searchParams.get('category');
      if (svcId) {
        const found = svcs.find((s) => String(s.id) === svcId);
        if (found) {
          setSelectedCategory(found);
        }
      }
    });
  }, [searchParams]); // eslint-disable-line

  // Auto-fill contact info on mount
  useEffect(() => {
    if (user) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      if (name) form.setFieldsValue({ contact_name: name });
      if (user.phone_number) form.setFieldsValue({ contact_phone: user.phone_number });
    }
  }, [user]); // eslint-disable-line

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    form.setFieldsValue({ selected_category: cat.id });
  };

  const handleDescriptionBlur = async () => {
    const desc = form.getFieldValue('description');
    if (desc && desc.length > 10) {
      try {
        const { data } = await api.post('/services/suggest/', { description: desc });
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
    // Photo upload sits outside the Form, so validate its state manually
    // alongside the Form's own validateFields call.
    const photoMissing = fileList.length === 0;
    if (photoMissing) {
      setPhotoError(t('newOrder.addAtLeastOnePhoto'));
    }
    try {
      const values = await form.validateFields();
      if (photoMissing) {
        message.warning(t('newOrder.addAtLeastOnePhoto'));
        return;
      }
      setFormValues(values);
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err?.errorFields?.length) {
        message.warning(t('newOrder.fixFormErrors'));
        form.scrollToField(err.errorFields[0].name, { behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = formValues;
      const fd = new FormData();
      if (selectedCategory.id !== 'admin_decide') {
        fd.append('selected_service', selectedCategory.id);
      }
      fd.append('pickup_location', pickupStops[0]?.text || values.pickup_location);
      if (pickupStops[0]?.coords) {
        fd.append('pickup_lat', pickupStops[0].coords.lat);
        fd.append('pickup_lng', pickupStops[0].coords.lng);
      }
      fd.append('destination_location', destStops[0]?.text || values.destination_location || '');
      if (destStops[0]?.coords) {
        fd.append('destination_lat', destStops[0].coords.lat);
        fd.append('destination_lng', destStops[0].coords.lng);
      }
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
        cargoParts.push(`${values.cargo_length || '-'} × ${values.cargo_width || '-'} × ${values.cargo_height || '-'} m`);
      }
      if (values.cargo_weight) cargoParts.push(`${values.cargo_weight} kg`);
      fd.append('cargo_details', cargoParts.join(', '));
      fd.append('user_note', values.user_note || '');
      if (suggestion?.id) fd.append('suggested_service', suggestion.id);
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
    if (activeStop.type === type) {
      if (activeStop.index >= index && activeStop.index > 0) {
        setActiveStop({ type, index: activeStop.index - 1 });
      }
    }
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

  useEffect(() => {
    if (distanceTimerRef.current) clearTimeout(distanceTimerRef.current);
    distanceTimerRef.current = setTimeout(calculateDistance, 800);
    return () => clearTimeout(distanceTimerRef.current);
  }, [calculateDistance]);

  const activeStopData = activeStop.type === 'pickup'
    ? pickupStops[activeStop.index]
    : destStops[activeStop.index];
  const activePosition = activeStopData?.coords
    ? [activeStopData.coords.lat, activeStopData.coords.lng]
    : null;

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
    (c) => !catSearch || localized(c.name).toLowerCase().includes(catSearch.toLowerCase()) || localized(c.description).toLowerCase().includes(catSearch.toLowerCase())
  );

  const inputStyle = { height: 48, borderRadius: 12, fontSize: 15 };

  // ─── STEP 0: ORDER FORM ───
  if (step === 0) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 90, maxWidth: 1200, margin: '0 auto' }} className="app-bg page-enter">
        {/* ── Header ── */}
        <div style={{
          background: 'var(--header-gradient)',
          padding: isDesktop ? '36px 40px 40px' : '28px 20px 32px',
          paddingTop: isDesktop ? 36 : 'calc(28px + env(safe-area-inset-top, 0px))',
          borderRadius: isDesktop ? '0 0 24px 24px' : '0 0 32px 32px',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -60, right: -40, width: 200, height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -30, left: -30, width: 120, height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '40%', left: '60%', width: 80, height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div onClick={() => navigate('/app')} style={{
                width: 44, height: 44, borderRadius: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 17, color: '#fff',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}>
                <ArrowLeftOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.2 }}>
                  {t('nav.newOrder')}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: 500 }}>
                  {t('newOrder.whatService')}
                </div>
              </div>
            </div>

            {/* ── Progress bar ── */}
            <div style={{
              marginTop: 22,
              background: 'rgba(255,255,255,0.13)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 18,
              padding: '16px 18px',
              border: '1px solid rgba(255,255,255,0.16)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <ProgressStep number={1} active label={t('newOrder.orderDetails')} />
                <div style={{
                  flex: 1, height: 2,
                  background: 'rgba(255,255,255,0.2)', borderRadius: 1,
                }} />
                <ProgressStep number={2} label={t('newOrder.confirmOrder')} />
              </div>
            </div>
          </div>
        </div>

        <Form form={form} layout="vertical" requiredMark={false}
          initialValues={{ selected_category: selectedCategory?.id }}
          style={{ margin: '0 auto', padding: isDesktop ? '0 40px' : '0 20px' }}
        >
          {/* ── SECTION: Service Type ── */}
          <SectionCard
            icon={<InboxOutlined />}
            title={t('newOrder.selectService')}
            first
          >
            {categories.length > 6 && (
              <Input
                prefix={<SearchOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('newOrder.searchService')}
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                allowClear
                style={{
                  marginBottom: 14, borderRadius: 12, height: 44,
                  background: 'var(--input-bg)', fontSize: 14,
                  border: '1px solid var(--border-light)',
                }}
              />
            )}

            {/* Category grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: showAllCategories
                ? (isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)')
                : (isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'),
              gap: isDesktop ? 10 : 8,
            }}>
              {/* "Not sure" option */}
              {!catSearch && (() => {
                const isActive = selectedCategory?.id === 'admin_decide';
                return (
                  <CategoryCard
                    isActive={isActive}
                    color="var(--text-tertiary)"
                    icon={<span style={{ fontSize: 20 }}>?</span>}
                    name={t('newOrder.notSure')}
                    dashed
                    onClick={() => {
                      setSelectedCategory({ id: 'admin_decide', name: t('newOrder.adminWillDecide'), icon: 'question', color: 'var(--text-tertiary)', requires_destination: true });
                      form.setFieldsValue({ selected_category: null });
                    }}
                  />
                );
              })()}
              {(showAllCategories ? filteredCategories : filteredCategories.slice(0, isDesktop ? 5 : 5)).map((cat) => {
                const isActive = selectedCategory?.id === cat.id;
                const color = cat.color || 'var(--accent)';
                return (
                  <CategoryCard
                    key={cat.id}
                    isActive={isActive}
                    color={color}
                    imageUrl={cat.image_url}
                    icon={cat.icon}
                    name={localized(cat.name)}
                    badge={cat.requires_destination ? t('newOrder.transportBadge') : null}
                    onClick={() => handleCategorySelect(cat)}
                  />
                );
              })}
            </div>
            {filteredCategories.length > 5 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 12,
                  cursor: 'pointer', background: 'var(--bg-tertiary)',
                  fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                  border: 'none', transition: 'all 0.2s',
                }}
              >
                {showAllCategories ? t('newOrder.showLess') : `${t('newOrder.showAll')} (${filteredCategories.length})`}
              </button>
            )}
          </SectionCard>

          {/* ── SECTION: Route ── */}
          <SectionCard
            icon={<EnvironmentOutlined />}
            title={needsDest ? t('newOrder.fromTo') : t('newOrder.workLocation')}
          >
            <div style={{
              display: isDesktop ? 'flex' : 'block',
              gap: isDesktop ? 20 : 0,
              alignItems: 'stretch',
            }}>
              {/* Left: Route builder */}
              <div style={{ flex: isDesktop ? 1 : undefined, minWidth: 0 }}>
                <div style={{
                  background: 'var(--bg-primary)', borderRadius: 14,
                  padding: isDesktop ? 14 : 12,
                  border: '1px solid var(--border-light)',
                }}>
                  {/* Pickup stops */}
                  {pickupStops.map((stop, idx) => (
                    <div key={`pickup-${idx}`}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: activeStop.type === 'pickup' && activeStop.index === idx
                            ? 'var(--accent-bg)' : 'transparent',
                          borderRadius: 12, padding: '4px 8px 4px 4px',
                          transition: 'background 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onClick={() => setActiveStop({ type: 'pickup', index: idx })}
                      >
                        {/* Timeline dot */}
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: 'var(--accent)',
                          flexShrink: 0,
                          boxShadow: '0 0 0 4px var(--accent-bg)',
                          transition: 'all 0.2s ease',
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
                              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: 'var(--text-tertiary)',
                              background: 'var(--bg-tertiary)', transition: 'all 0.15s ease',
                            }}
                          >
                            <DeleteOutlined style={{ fontSize: 12 }} />
                          </div>
                        )}
                      </div>
                      {/* Connector line */}
                      {(idx < pickupStops.length - 1 || needsDest) && (
                        <div style={{ paddingLeft: 5, margin: '1px 0' }}>
                          <div style={{
                            width: 2, height: idx < pickupStops.length - 1 ? 14 : 20,
                            background: 'var(--border-color)',
                            marginLeft: 0, borderRadius: 1,
                          }} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add pickup button */}
                  <div
                    onClick={() => addStop('pickup')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', cursor: 'pointer', marginLeft: 20,
                      color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                      borderRadius: 8, transition: 'background 0.15s',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <PlusOutlined style={{ fontSize: 10 }} />
                    {t('newOrder.addPickupStop')}
                  </div>

                  {/* Separator */}
                  {needsDest && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      margin: '8px 0', padding: '0 4px',
                    }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
                      <SwapRightOutlined style={{ color: 'var(--text-placeholder)', fontSize: 14 }} />
                      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
                    </div>
                  )}

                  {/* Destination stops */}
                  {needsDest && destStops.map((stop, idx) => (
                    <div key={`dest-${idx}`}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: activeStop.type === 'dest' && activeStop.index === idx
                            ? '#ef44440a' : 'transparent',
                          borderRadius: 12, padding: '4px 8px 4px 4px',
                          transition: 'background 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onClick={() => setActiveStop({ type: 'dest', index: idx })}
                      >
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: '#ef4444', flexShrink: 0,
                          boxShadow: '0 0 0 4px #ef444418',
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
                              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: 'var(--text-tertiary)',
                              background: 'var(--bg-tertiary)', transition: 'all 0.15s ease',
                            }}
                          >
                            <DeleteOutlined style={{ fontSize: 12 }} />
                          </div>
                        )}
                      </div>
                      {idx < destStops.length - 1 && (
                        <div style={{ paddingLeft: 5, margin: '1px 0' }}>
                          <div style={{
                            width: 2, height: 14,
                            background: '#ef444430',
                            marginLeft: 0, borderRadius: 1,
                          }} />
                        </div>
                      )}
                    </div>
                  ))}

                  {needsDest && (
                    <div
                      onClick={() => addStop('dest')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', cursor: 'pointer', marginLeft: 20,
                        color: '#ef4444', fontSize: 12, fontWeight: 600,
                        borderRadius: 8, transition: 'background 0.15s',
                        background: 'transparent',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ef44440a'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <PlusOutlined style={{ fontSize: 10 }} />
                      {t('newOrder.addDestStop')}
                    </div>
                  )}
                </div>

                {/* Distance badge */}
                {totalDistance && (
                  <div style={{
                    background: 'var(--accent-bg)', borderRadius: 12, padding: '12px 16px',
                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 12,
                    border: '1px solid var(--accent-bg-strong)',
                    animation: 'fadeInUp 0.3s ease-out both',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--accent-bg-strong)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CarOutlined style={{ color: 'var(--accent)', fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatDistance(totalDistance.distance)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        ~ {formatDuration(totalDistance.duration)}
                      </div>
                    </div>
                    {distanceLoading && <Spin size="small" />}
                  </div>
                )}
                {distanceLoading && !totalDistance && (
                  <div style={{
                    textAlign: 'center', padding: '10px 0', fontSize: 12,
                    color: 'var(--text-tertiary)',
                  }}>
                    <Spin size="small" style={{ marginRight: 8 }} />
                    {t('newOrder.calculating')}
                  </div>
                )}
              </div>

              {/* Right: Map */}
              <div style={{
                flex: isDesktop ? 1 : undefined,
                minWidth: 0, marginTop: isDesktop ? 0 : 12,
                position: isDesktop ? 'sticky' : 'static',
                top: isDesktop ? 20 : undefined,
                alignSelf: isDesktop ? 'flex-start' : undefined,
              }}>
                {/* Map tab pills */}
                <div style={{
                  display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap',
                }}>
                  {pickupStops.map((_, idx) => (
                    <button
                      key={`pickup-tab-${idx}`}
                      onClick={() => setActiveStop({ type: 'pickup', index: idx })}
                      style={{
                        padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: activeStop.type === 'pickup' && activeStop.index === idx
                          ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: activeStop.type === 'pickup' && activeStop.index === idx
                          ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <EnvironmentOutlined style={{ marginRight: 4, fontSize: 11 }} />
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
                        padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: activeStop.type === 'dest' && activeStop.index === idx
                          ? '#ef4444' : 'var(--bg-tertiary)',
                        color: activeStop.type === 'dest' && activeStop.index === idx
                          ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <EnvironmentOutlined style={{ marginRight: 4, fontSize: 11 }} />
                      {destStops.length > 1 ? `${t('newOrder.destinationMap')} ${idx + 1}` : t('newOrder.destinationMap')}
                    </button>
                  ))}
                </div>

                <div style={{
                  borderRadius: 16, overflow: 'hidden',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <MapPicker
                    position={activePosition}
                    onSelect={({ lat, lng, address }) => {
                      updateStop(activeStop.type === 'dest' ? 'dest' : 'pickup', activeStop.index, {
                        text: address,
                        coords: { lat, lng },
                      });
                    }}
                    height={isDesktop ? 360 : 240}
                    markerColor={activeStop.type === 'dest' ? 'red' : 'green'}
                    placeholder={
                      activeStop.type === 'dest'
                        ? t('newOrder.tapDestination')
                        : (needsDest ? t('newOrder.tapPickup') : t('newOrder.tapLocation'))
                    }
                    extraMarkers={extraMarkers}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── SECTION: Date & Time ── */}
          <SectionCard icon={<CalendarOutlined />} title={t('newOrder.when')}>
            {(() => {
              const allLocations = [
                ...pickupStops.map((s) => s.text),
                ...destStops.map((s) => s.text),
              ];
              const { applicable, disabledTime } = computeRestrictions(
                restrictedTimeWindows, allLocations,
              );
              return (
                <>
                  {applicable.length > 0 && (
                    <div style={{
                      background: '#fff7ed', borderRadius: 12, padding: '10px 14px',
                      marginBottom: 12, border: '1px solid #fed7aa',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <ClockCircleOutlined style={{ color: '#c2410c', fontSize: 16, marginTop: 2 }} />
                      <div style={{ flex: 1, fontSize: 13, color: '#7c2d12', lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          {t('newOrder.restrictedTimesTitle')}
                        </div>
                        {applicable.map((w) => (
                          <div key={w.id}>
                            • {w.location_keyword}: {w.start_time?.slice(0, 5)}–{w.end_time?.slice(0, 5)}
                            {w.description ? ` — ${w.description}` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Form.Item name="requested_date" style={{ flex: 1, marginBottom: 0 }}
                      rules={[{ required: true, message: t('newOrder.selectDate') }]}>
                      <DatePicker
                        style={{ width: '100%', height: 48, borderRadius: 12, fontSize: 15 }}
                        placeholder={t('newOrder.selectDate')}
                        disabledDate={(d) => d && d < dayjs().startOf('day')}
                        inputReadOnly suffixIcon={<CalendarOutlined />}
                      />
                    </Form.Item>
                    <Form.Item name="requested_time" style={{ flex: 1, marginBottom: 0 }}
                      rules={[{ required: true, message: t('newOrder.selectTime') }]}>
                      <TimePicker
                        format="HH:mm"
                        style={{ width: '100%', height: 48, borderRadius: 12, fontSize: 15 }}
                        placeholder={t('newOrder.preferredTime')}
                        inputReadOnly suffixIcon={<ClockCircleOutlined />}
                        disabledTime={disabledTime}
                        hideDisabledOptions
                      />
                    </Form.Item>
                  </div>
                </>
              );
            })()}
          </SectionCard>

          {/* ── SECTION: Description ── */}
          <SectionCard icon={<FileTextOutlined />} title={t('newOrder.whatDone')}>
            <Form.Item name="description" rules={[{ required: true, message: t('newOrder.describeJob') }]}
              style={{ marginBottom: 0 }}>
              <TextArea rows={3} placeholder={t('newOrder.describeNeed')} onBlur={handleDescriptionBlur}
                style={{ borderRadius: 12, fontSize: 15, padding: '12px 14px', resize: 'none' }} />
            </Form.Item>

            {suggestion && (
              <div style={{
                background: 'var(--accent-bg)', borderRadius: 12, padding: '12px 16px',
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid var(--accent-bg-strong)',
                animation: 'fadeInUp 0.3s ease-out both',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--accent-bg-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <BulbOutlined style={{ color: 'var(--accent)', fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>
                  {t('newOrder.suggested')} <strong>{localized(suggestion.name)}</strong>
                </div>
                <Button size="small" type="link" onClick={applySuggestion}
                  style={{ color: 'var(--accent)', fontWeight: 700, padding: '0 8px' }}>
                  {t('common.apply')}
                </Button>
                <CloseOutlined onClick={() => setSuggestion(null)}
                  style={{ color: 'var(--text-tertiary)', fontSize: 11, cursor: 'pointer', padding: 4 }} />
              </div>
            )}

            {/* Cargo details */}
            <div style={{
              marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10,
            }}>
              <ExpandOutlined style={{ fontSize: 13, color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('newOrder.cargoDetails')}
              </span>
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                {t('newOrder.requiredLabel')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Form.Item name="cargo_length" style={{ flex: 1, marginBottom: 0 }}
                rules={[{ required: true, message: t('newOrder.enterLength') }]}>
                <Input placeholder={t('newOrder.length')} suffix={t('newOrder.cm')}
                  inputMode="decimal" style={{ borderRadius: 12, fontSize: 14, height: 44 }} />
              </Form.Item>
              <Form.Item name="cargo_width" style={{ flex: 1, marginBottom: 0 }}
                rules={[{ required: true, message: t('newOrder.enterWidth') }]}>
                <Input placeholder={t('newOrder.width')} suffix={t('newOrder.cm')}
                  inputMode="decimal" style={{ borderRadius: 12, fontSize: 14, height: 44 }} />
              </Form.Item>
              <Form.Item name="cargo_height" style={{ flex: 1, marginBottom: 0 }}
                rules={[{ required: true, message: t('newOrder.enterHeight') }]}>
                <Input placeholder={t('newOrder.height')} suffix={t('newOrder.cm')}
                  inputMode="decimal" style={{ borderRadius: 12, fontSize: 14, height: 44 }} />
              </Form.Item>
            </div>
            <Form.Item name="cargo_weight" style={{ marginBottom: 0 }}
              rules={[{ required: true, message: t('newOrder.enterWeight') }]}>
              <Input placeholder={t('newOrder.weight')} suffix={t('newOrder.kg')}
                inputMode="decimal" style={{ borderRadius: 12, fontSize: 14, height: 44 }} />
            </Form.Item>
          </SectionCard>

          {/* ── SECTION: Contact ── */}
          <SectionCard icon={<UserOutlined />} title={t('newOrder.contactPerson')}>
            <Form.Item name="contact_name" rules={[{ required: true, message: t('newOrder.enterContact') }]}
              style={{ marginBottom: 10 }}>
              <Input prefix={<UserOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('newOrder.fullName')} autoComplete="name" style={inputStyle} />
            </Form.Item>
            <Form.Item name="contact_phone" rules={[{ required: true, message: t('newOrder.enterPhone') }]}
              style={{ marginBottom: 0 }}>
              <Input prefix={<PhoneOutlined style={{ color: 'var(--text-placeholder)' }} />}
                placeholder={t('auth.phone')} inputMode="tel" autoComplete="tel" style={inputStyle} />
            </Form.Item>
          </SectionCard>

          {/* ── SECTION: Photos & Notes ── */}
          <SectionCard icon={<CameraOutlined />} title={t('newOrder.additional')} last>
            <Form.Item name="user_note" style={{ marginBottom: 12 }}
              rules={[{ required: true, message: t('newOrder.enterNote') }]}>
              <TextArea rows={2} placeholder={t('newOrder.notesForUs')}
                style={{ borderRadius: 12, fontSize: 15, padding: '12px 14px', resize: 'none' }} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}
              required
              validateStatus={photoError ? 'error' : ''}
              help={photoError || undefined}>
              <Upload listType="picture" fileList={fileList}
                onChange={({ fileList: fl }) => {
                  setFileList(fl);
                  if (fl.length > 0) setPhotoError('');
                }}
                beforeUpload={() => false} multiple accept="image/*">
                <Button icon={<CameraOutlined />}
                  style={{
                    borderRadius: 12, height: 44,
                    border: '2px dashed var(--border-color)',
                    color: 'var(--text-secondary)', fontWeight: 600,
                    background: 'var(--bg-tertiary)',
                    width: '100%',
                  }}>
                  {t('newOrder.addPhotos')}
                </Button>
              </Upload>
            </Form.Item>
          </SectionCard>
        </Form>

        {/* ── Sticky CTA ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{
            margin: '0 auto',
            maxWidth: 1200, padding: isDesktop ? '24px 40px' : '24px 20px', paddingBottom: isDesktop ? 'calc(24px + env(safe-area-inset-bottom, 0px))' : 'calc(24px + env(safe-area-inset-bottom, 0px))',
          }}>
            <Button type="primary" block onClick={goToConfirm}
              style={{
                height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700,
                background: 'var(--fab-gradient)', border: 'none',
                boxShadow: 'var(--fab-shadow)', letterSpacing: -0.2,
              }}>
              {t('newOrder.reviewOrder')} <RightOutlined style={{ fontSize: 13, marginLeft: 4 }} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 1: CONFIRMATION ───
  // Guard: if essential state is missing (e.g. hard refresh on step 1), show a fallback
  if (!selectedCategory || !formValues.description) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }} className="app-bg">
        <div style={{
          background: 'var(--card-bg)', borderRadius: 18,
          padding: '32px 28px', maxWidth: 420, width: '100%',
          border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--accent-bg)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontSize: 28,
          }}>
            <FileTextOutlined />
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 8, letterSpacing: -0.2,
          }}>
            {t('newOrder.orderDetails')}
          </div>
          <div style={{
            fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5,
          }}>
            {t('newOrder.fillDetailsFirst')}
          </div>
          <Button type="primary" block onClick={() => setStep(0)}
            style={{
              height: 48, borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: 'var(--fab-gradient)', border: 'none',
              boxShadow: 'var(--fab-shadow)',
            }}>
            <ArrowLeftOutlined style={{ fontSize: 13, marginRight: 6 }} />
            {t('newOrder.backToForm')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }} className="app-bg page-enter">
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
          width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, color: 'var(--text-primary)',
          background: 'var(--bg-tertiary)', transition: 'all 0.2s ease',
        }}>
          <ArrowLeftOutlined />
        </div>
        <div style={{ flex: 1, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.3 }}>
          {t('newOrder.confirmOrder')}
        </div>
      </div>

      {/* Progress indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px 8px',
      }}>
        <ProgressStep number={1} done label={t('newOrder.orderDetails')} />
        <div style={{
          flex: 1, height: 2,
          background: 'var(--accent)', borderRadius: 1,
        }} />
        <ProgressStep number={2} active label={t('newOrder.confirmOrder')} />
      </div>

      <div style={{ padding: isDesktop ? '32px 40px 48px' : '32px 20px 48px' }}>
        {/* Hero checkmark */}
        <div style={{
          textAlign: 'center', marginBottom: 24,
          animation: 'fadeInUp 0.4s ease-out both',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--accent-bg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: 'var(--accent)', marginBottom: 12,
          }}>
            <CheckCircleOutlined />
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3,
          }}>
            {t('newOrder.reviewOrder')}
          </div>
        </div>

        {/* ── Service Type Card ── */}
        <ConfirmSection delay={0.05} icon={<InboxOutlined />} title={t('newOrder.serviceType')}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 12,
            background: 'var(--accent-bg)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--accent-bg-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'var(--accent)',
            }}>
              <CategoryImage imageUrl={selectedCategory?.image_url} icon={selectedCategory?.icon || 'inbox'} size={selectedCategory?.image_url ? 40 : 28} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {localized(selectedCategory?.name)}
            </div>
          </div>
        </ConfirmSection>

        {/* ── Description Card ── */}
        <ConfirmSection delay={0.1} icon={<FileTextOutlined />} title={t('orders.description')}>
          <div style={{
            fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
            padding: '8px 0',
          }}>
            {formValues.description}
          </div>
          {(formValues.cargo_length || formValues.cargo_width || formValues.cargo_height || formValues.cargo_weight) && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8,
              paddingTop: 10, borderTop: '1px solid var(--border-light)',
            }}>
              {(formValues.cargo_length || formValues.cargo_width || formValues.cargo_height) && (
                <InfoChip label={t('newOrder.dimensions')} value={`${formValues.cargo_length || '-'} × ${formValues.cargo_width || '-'} × ${formValues.cargo_height || '-'} ${t('newOrder.cm')}`} />
              )}
              {formValues.cargo_weight && (
                <InfoChip label={t('newOrder.weight')} value={`${formValues.cargo_weight} ${t('newOrder.kg')}`} />
              )}
            </div>
          )}
        </ConfirmSection>

        {/* ── Route Card ── */}
        <ConfirmSection delay={0.15} icon={<EnvironmentOutlined />} title={needsDest ? t('newOrder.route') : t('newOrder.workLocation')}>
          {pickupStops.filter(s => s.text).map((stop, idx) => (
            <div key={`cp-${idx}`} style={{
              display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: needsDest ? '#10b98114' : 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <EnvironmentOutlined style={{
                  color: needsDest ? 'var(--success-color)' : 'var(--accent)', fontSize: 14,
                }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {needsDest
                    ? (pickupStops.filter(s => s.text).length > 1 ? `${t('orders.pickup')} ${idx + 1}` : t('orders.pickup'))
                    : t('orders.location')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 2 }}>
                  {stop.text}
                </div>
              </div>
            </div>
          ))}

          {needsDest && destStops.filter(s => s.text).map((stop, idx) => (
            <div key={`cd-${idx}`} style={{
              display: 'flex', gap: 12, alignItems: 'center',
              marginBottom: idx < destStops.filter(s => s.text).length - 1 ? 10 : 0,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: '#ef444414',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <EnvironmentOutlined style={{ color: '#ef4444', fontSize: 14 }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {destStops.filter(s => s.text).length > 1 ? `${t('orders.destination')} ${idx + 1}` : t('orders.destination')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginTop: 2 }}>
                  {stop.text}
                </div>
              </div>
            </div>
          ))}

          {totalDistance && (
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CarOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatDistance(totalDistance.distance)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                ~ {formatDuration(totalDistance.duration)}
              </span>
            </div>
          )}
        </ConfirmSection>

        {/* ── Schedule Card ── */}
        <ConfirmSection delay={0.2} icon={<CalendarOutlined />} title={t('newOrder.when')}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {t('orders.date')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                {formValues.requested_date?.format('DD MMM YYYY')}
              </div>
            </div>
            {formValues.requested_time && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {t('orders.time')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 3 }}>
                  {formValues.requested_time?.format('HH:mm')}
                </div>
              </div>
            )}
          </div>
        </ConfirmSection>

        {/* ── Contact Card ── */}
        <ConfirmSection delay={0.25} icon={<UserOutlined />} title={t('newOrder.contactPerson')}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {t('orders.contact')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 3 }}>
                {formValues.contact_name}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {t('auth.phone')}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 3 }}>
                {formValues.contact_phone}
              </div>
            </div>
          </div>
        </ConfirmSection>

        {/* ── Photos & Notes ── */}
        {(fileList.length > 0 || formValues.user_note) && (
          <ConfirmSection delay={0.3} icon={<CameraOutlined />} title={t('newOrder.additional')}>
            {fileList.length > 0 && (
              <div style={{ marginBottom: formValues.user_note ? 10 : 0 }}>
                <InfoChip label={t('orders.photos')} value={t('newOrder.imagesAttached', { count: fileList.length })} />
              </div>
            )}
            {formValues.user_note && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{formValues.user_note}"
              </div>
            )}
          </ConfirmSection>
        )}

        {/* ── Action buttons ── */}
        <div style={{ marginTop: 24 }}>
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
            <ArrowLeftOutlined style={{ fontSize: 12, marginRight: 6 }} />
            {t('newOrder.orderDetails')}
          </Button>
        </div>
      </div>
    </div>
  );
}


// ─── Sub-components ───

function ProgressStep({ number, active, done, label }) {
  const bg = active
    ? 'rgba(255,255,255,0.22)'
    : done
    ? 'var(--accent-bg)'
    : 'rgba(255,255,255,0.08)';
  const color = active
    ? '#fff'
    : done
    ? 'var(--accent)'
    : 'rgba(255,255,255,0.45)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 14px 6px 8px', borderRadius: 20,
      background: bg, transition: 'all 0.3s ease',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: active ? 'rgba(255,255,255,0.25)' : done ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        color: (active || done) ? '#fff' : 'rgba(255,255,255,0.4)',
      }}>
        {done ? <CheckCircleOutlined style={{ fontSize: 12 }} /> : number}
      </div>
      <span style={{
        fontSize: 12, fontWeight: active ? 700 : 500,
        color, whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  );
}

function SectionCard({ icon, title, children, first, last }) {
  return (
    <div style={{
      marginTop: first ? 36 : 24,
      marginBottom: last ? 24 : 0,
      background: 'var(--card-bg)',
      borderRadius: 18,
      padding: '36px 36px',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
      animation: 'fadeInUp 0.4s ease-out both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 24,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: 'var(--accent)',
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: -0.2,
        }}>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function CategoryCard({ isActive, color, icon, imageUrl, name, badge, dashed, onClick }) {
  return (
    <div
      onClick={onClick}
      className="card-interactive"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, padding: '14px 8px 12px', borderRadius: 14, cursor: 'pointer',
        background: isActive ? `${color}10` : 'var(--bg-primary)',
        border: isActive
          ? `2px solid ${color}`
          : dashed
          ? '2px dashed var(--border-color)'
          : '1px solid var(--border-color)',
        boxShadow: isActive ? `0 0 0 3px ${color}0a` : 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
        textAlign: 'center',
        minHeight: 90,
        justifyContent: 'center',
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '4 / 3',
        borderRadius: 10,
        background: imageUrl
          ? 'var(--bg-secondary)'
          : (isActive ? `${color}18` : 'var(--bg-tertiary)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isActive ? color : 'var(--text-secondary)',
        transition: 'all 0.2s ease', overflow: 'hidden',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{
            maxWidth: '100%', maxHeight: '100%',
            width: 'auto', height: 'auto',
            objectFit: 'contain', display: 'block',
          }} />
        ) : (
          <CategoryImage icon={icon} size={32} />
        )}
      </div>
      <div>
        <div style={{
          fontSize: 12, fontWeight: isActive ? 700 : 600,
          color: isActive ? color : 'var(--text-primary)',
          lineHeight: 1.3,
        }}>
          {name}
        </div>
        {badge && (
          <div style={{
            fontSize: 10, color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 2, marginTop: 3,
          }}>
            <SwapRightOutlined style={{ fontSize: 9 }} /> {badge}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmSection({ children, delay = 0, icon, title }) {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 18, padding: '36px 36px',
      marginBottom: 24, boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-color)',
      animation: `fadeInUp 0.4s ease-out ${delay}s both`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12, paddingBottom: 10,
        borderBottom: '1px solid var(--border-light)',
      }}>
        <span style={{ fontSize: 14, color: 'var(--accent)' }}>{icon}</span>
        <span style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
          letterSpacing: -0.1, textTransform: 'uppercase',
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      background: 'var(--bg-tertiary)',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}:</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
