const fs = require('fs');
const content = fs.readFileSync('src/components/GoogleMapView.tsx', 'utf8');

const updatedContent = content.replace(
  /const mapContainerRef = useRef<HTMLDivElement \| null>\(null\);[\s\S]*?const mapsUrl = /m,
  `const mapContainerRef = useRef<HTMLDivElement | null>(null);
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
    const tileUrl = \`https://mt{s}.google.com/vt/lyrs=\${tileType}&hl=id&x={x}&y={y}&z={z}\`;

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
      html: \`
        <div style="width: 34px; height: 46px; pointer-events: \${isDraggable ? 'auto' : 'none'}; cursor: \${isDraggable ? 'grab' : 'default'};">
          <svg viewBox="0 0 34 46" width="34" height="46" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 12.8 17 29 17 29s17-16.2 17-29c0-9.39-7.61-17-17-17z" fill="#EA4335" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="17" cy="17" r="6.5" fill="#FFFFFF"/>
          </svg>
        </div>
      \`,
      iconSize: [34, 46],
      iconAnchor: [17, 46],
    });

    markerInstanceRef.current = L.marker([latitude, longitude], { 
      icon: googlePinIcon,
      draggable: isDraggable
    }).addTo(map);

    // Initial popup binding
    if (!isDraggable) {
      markerInstanceRef.current.bindPopup(\`
        <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
          <strong style="color: #0f172a; display: block; margin-bottom: 2px;">\${locationName}</strong>
          <span style="color: #4f46e5; font-size: 11px;">● Radius Pantau: \${radiusMeters} meter</span>
        </div>
      \`);
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
      tileLayerRef.current.setUrl(\`https://mt{s}.google.com/vt/lyrs=\${tileType}&hl=id&x={x}&y={y}&z={z}\`);
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

  const mapsUrl = `
);

fs.writeFileSync('src/components/GoogleMapView.tsx', updatedContent);
