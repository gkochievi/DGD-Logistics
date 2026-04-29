import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

/**
 * Location autocomplete input using OpenStreetMap Nominatim API.
 * Provides address suggestions as the user types.
 */
export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  prefix,
  style,
  size = 'large',
  dropdownStyle,
  countryCode,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      if (countryCode) {
        url += `&countrycodes=${countryCode}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      const results = data.map((item) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        short_name: formatShortName(item),
        country_code: item.address?.country_code || '',
      }));
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchLocations(val), 600);
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion.short_name);
    setOpen(false);
    setSuggestions([]);
    if (onSelect) {
      onSelect({
        address: suggestion.short_name,
        fullAddress: suggestion.display_name,
        lat: suggestion.lat,
        lng: suggestion.lng,
        countryCode: suggestion.country_code,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, ...style }}>
      <Input
        ref={inputRef}
        prefix={prefix}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        size={size}
        style={{ height: 48, fontSize: 15 }}
        suffix={
          // Always render a fixed-size suffix slot so Ant Design's affix
          // wrapper stays mounted — toggling suffix between null and a node
          // remounts the inner <input> element and kills focus mid-typing.
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
          }}>
            {loading && <LoadingOutlined spin style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />}
          </span>
        }
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: 'var(--card-bg, #fff)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid var(--border-color, #f0f0f0)',
            marginTop: 4,
            overflow: 'hidden',
            ...dropdownStyle,
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-primary, #222)',
                background: i === activeIndex ? 'var(--accent-bg, #f0f0ff)' : 'transparent',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-color, #f5f5f5)' : 'none',
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <span style={{
                color: 'var(--accent, #00B856)',
                fontSize: 16,
                marginTop: 1,
                flexShrink: 0,
              }}>
                📍
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {s.short_name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-tertiary, #999)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 2,
                }}>
                  {s.display_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatShortName(item) {
  const addr = item.address || {};
  const parts = [];
  // City / town / village
  const city = addr.city || addr.town || addr.village || addr.municipality || '';
  const road = addr.road || addr.pedestrian || '';
  const houseNumber = addr.house_number || '';
  const state = addr.state || '';
  const country = addr.country || '';

  if (road) {
    parts.push(houseNumber ? `${road} ${houseNumber}` : road);
  }
  if (city) parts.push(city);
  if (!city && state) parts.push(state);
  if (country) parts.push(country);

  return parts.length > 0 ? parts.join(', ') : item.display_name;
}
