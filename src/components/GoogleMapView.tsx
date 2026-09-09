import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Layers } from 'lucide-react';

interface GoogleMapViewProps {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  locationName?: string;
  className?: string;
  isDraggable?: boolean;
  onDragEnd?: (lat: number, lng: number) => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  latitude,
  longitude,
  radiusMeters = 150,
  locationName = 'Titik Patroli',
  className = 'w-full h-64 sm:h-72',
  isDraggable = false,
  onDragEnd,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const circleInstanceRef = useRef<L.Circle | null>(null);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Google Maps Tile Layer
    const tileType = mapType === 'satellite' ? 'y' : 'm';
    const tileUrl = `https://mt{s}.google.com/vt/lyrs=${tileType}&hl=id&x={x}&y={y}&z={z}`;

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
    }).addTo(map);

    circleInstanceRef.current = L.circle([latitude, longitude], {
      radius: radiusMeters,
      color: '#4f46e5',
      weight: 2.5,
      dashArray: '6, 6',
      fillColor: '#6366f1',
      fillOpacity: 0.22,
    }).addTo(map);

    const googlePinIcon = L.divIcon({
      className: 'bg-transparent',
      html: `
        <div style="width: 34px; height: 46px; pointer-events: ${isDraggable ? 'auto' : 'none'}; cursor: ${isDraggable ? 'grab' : 'default'};">
          <svg viewBox="0 0 34 46" width="34" height="46" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 12.8 17 29 17 29s17-16.2 17-29c0-9.39-7.61-17-17-17z" fill="#EA4335" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="17" cy="17" r="6.5" fill="#FFFFFF"/>
          </svg>
        </div>
      `,
      iconSize: [34, 46],
      iconAnchor: [17, 46],
    });

    markerInstanceRef.current = L.marker([latitude, longitude], { 
      icon: googlePinIcon,
      draggable: isDraggable
    }).addTo(map);

    // Initial popup binding
    if (!isDraggable) {
      markerInstanceRef.current.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
          <strong style="color: #0f172a; display: block; margin-bottom: 2px;">${locationName}</strong>
          <span style="color: #4f46e5; font-size: 11px;">● Radius Pantau: ${radiusMeters} meter</span>
        </div>
      `);
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run only once on mount

  // Update center and marker when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Only update if coordinates are significantly different to avoid drag conflicts
    const currentCenter = mapInstanceRef.current.getCenter();
    const isDifferent = Math.abs(currentCenter.lat - latitude) > 0.00001 || Math.abs(currentCenter.lng - longitude) > 0.00001;
    
    if (isDifferent) {
      mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([latitude, longitude]);
      }
      if (circleInstanceRef.current) {
        circleInstanceRef.current.setLatLng([latitude, longitude]);
        circleInstanceRef.current.setRadius(radiusMeters);
      }
    }
  }, [latitude, longitude, radiusMeters]);

  // Update map type when it changes
  useEffect(() => {
    if (tileLayerRef.current) {
      const tileType = mapType === 'satellite' ? 'y' : 'm';
      tileLayerRef.current.setUrl(`https://mt{s}.google.com/vt/lyrs=${tileType}&hl=id&x={x}&y={y}&z={z}`);
    }
  }, [mapType]);
  
  // Attach drag events dynamically if draggable changes
  useEffect(() => {
    if (!markerInstanceRef.current) return;
    const marker = markerInstanceRef.current;
    
    // Clear previous listeners
    marker.off('dragend');
    
    if (isDraggable && onDragEnd) {
      marker.dragging?.enable();
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onDragEnd(position.lat, position.lng);
      });
    } else {
      marker.dragging?.disable();
    }
  }, [isDraggable, onDragEnd]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm flex flex-col">
      {/* Map Bar Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div>
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
            Potongan Peta Google Maps (Radius ±{radiusMeters} m)
          </span>
          <span className="text-[11px] text-emerald-600 font-mono font-bold">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Layer Toggle: Jalan vs Satelit */}
          <button
            type="button"
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
              mapType === 'satellite'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Ganti tampilan peta Google (Jalan / Citra Satelit)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapType === 'satellite' ? 'Satelit' : 'Peta Jalan'}</span>
          </button>

          {/* Open directly in Google Maps */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-indigo-700 border border-slate-300 text-xs font-bold transition shadow-xs"
            title="Buka titik koordinat ini langsung di Google Maps"
          >
            <span>Buka Google Maps</span>
            <Navigation className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Map Interactive Canvas */}
      <div className={`relative ${className} w-full bg-slate-200 z-0`}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Google Maps Logo Watermark Badge */}
        <div className="absolute bottom-2 left-2 z-400 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md shadow-sm border border-slate-200 pointer-events-none flex items-center space-x-1.5 text-[11px] font-bold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          <span>Google Maps</span>
        </div>

        {/* Floating 150m Radius Live Indicator */}
        <div className="absolute top-2 right-2 z-400 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[11px] font-medium shadow-md pointer-events-none flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Zona Pantau {radiusMeters} Meter</span>
        </div>
      </div>
    </div>
  );
};
