import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export default function MapPicker({
  position,
  onSelect,
  height = 200,
  markerColor = 'green',
  placeholder = 'Tap on the map to select location',
}) {
  const [center, setCenter] = useState(position || [40.7128, -74.006]); // Default: NYC
  const mapRef = useRef(null);

  useEffect(() => {
    // Try to get user's location
    if (!position && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCenter = [pos.coords.latitude, pos.coords.longitude];
          setCenter(newCenter);
          if (mapRef.current) {
            mapRef.current.setView(newCenter, 13);
          }
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (position && mapRef.current) {
      mapRef.current.setView(position, 14);
    }
  }, [position]);

  const handleClick = async (latlng) => {
    const { lat, lng } = latlng;
    // Reverse geocode using Nominatim (free)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onSelect({ lat, lng, address });
    } catch {
      onSelect({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  };

  const icon = markerColor === 'red' ? redIcon : greenIcon;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height, width: '100%' }}
        ref={mapRef}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={handleClick} />
        {position && <Marker position={position} icon={icon} />}
      </MapContainer>
      {!position && (
        <div style={{
          padding: '8px 12px', background: '#fafafa', fontSize: 12, color: '#999',
          textAlign: 'center',
        }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}

export function MapView({ markers = [], height = 200, zoom = 12 }) {
  if (!markers.length) return null;

  const center = markers[0].position;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m, i) => (
          <Marker
            key={i}
            position={m.position}
            icon={m.color === 'red' ? redIcon : greenIcon}
          />
        ))}
      </MapContainer>
    </div>
  );
}
