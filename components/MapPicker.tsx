'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet when bundled/packaged
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  readOnly?: boolean;
  heightClass?: string;
}

export default function MapPicker({ onLocationSelect, initialLat, initialLng, readOnly = false, heightClass }: MapPickerProps) {
  const defaultCenter: [number, number] = [24.8829, 74.6269];
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (initialLat !== undefined && initialLng !== undefined) {
      setPosition([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      if (center) {
        map.setView(center, map.getZoom());
      }
    }, [center]);
    return null;
  }

  function MapEventsHandler() {
    useMapEvents({
      click(e) {
        if (readOnly || !onLocationSelect) return;
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);
      },
    });
    return null;
  }

  return (
    <div className={`w-full ${heightClass || 'h-80'} relative rounded-xl overflow-hidden border border-slate-200 shadow-sm z-0`}>
      <MapContainer
        center={position || defaultCenter}
        zoom={14}
        scrollWheelZoom={!readOnly}
        dragging={!readOnly}
        zoomControl={!readOnly}
        doubleClickZoom={!readOnly}
        touchZoom={!readOnly}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={position || defaultCenter} />
        <MapEventsHandler />
        {position && <Marker position={position} icon={DefaultIcon} />}
      </MapContainer>
    </div>
  );
}
