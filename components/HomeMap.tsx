'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapGrievance {
  id: string;
  grievance_id: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
  status: string;
  created_at: string;
}

interface HomeMapProps {
  center: [number, number];
  grievances: MapGrievance[];
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Roads': '#DC2626',
    'Water Supply': '#2563EB',
    'Electricity': '#D97706',
    'Others': '#6B7280'
  };
  return colors[category] || '#6B7280';
};

const createColoredMarker = (color: string) => L.divIcon({
  html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  className: ''
});

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minutes ago`;
  }
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }
  return `${hours} hours ago`;
};

export default function HomeMap({ center, grievances }: HomeMapProps) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {grievances.map((g) => {
          const color = getCategoryColor(g.category);
          const icon = createColoredMarker(color);
          return (
            <Marker
              key={g.id}
              position={[g.latitude, g.longitude]}
              icon={icon}
            >
              <Popup>
                <div className="text-xs space-y-1 p-0.5">
                  <div className="font-extrabold text-[#041A3E] text-sm">{g.category} Issue</div>
                  <div><strong>ID:</strong> <span className="font-mono">{g.grievance_id}</span></div>
                  <div><strong>Severity:</strong> {g.severity}</div>
                  <div><strong>Status:</strong> {g.status.replace('_', ' ')}</div>
                  <div className="text-slate-400 mt-1 italic font-medium">Reported {formatTimeAgo(g.created_at)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
