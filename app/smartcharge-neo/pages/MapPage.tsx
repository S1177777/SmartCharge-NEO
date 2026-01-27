import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Zap, Layers, Bell, Plus, Minus, Navigation as NavIcon, Heart, X, Target, Compass, Globe, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { STATIONS } from '../constants';
import { Station } from '../types';
import { fetchStations } from '../services/api';

const MapPage = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>(STATIONS); // 初始使用静态数据作为后备
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Live Coordinate States
  const [cursorPos, setCursorPos] = useState({ lat: 48.8566, lng: 2.3522 });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // 从 API 获取站点数据
  const loadStations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStations();
      if (data.length > 0) {
        setStations(data);
        // 默认选择第一个站点
        if (!selectedStation) {
          setSelectedStation(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch stations:', err);
      setError('无法加载站点数据，使用本地数据');
      // 错误时回退到静态数据
      setStations(STATIONS);
      if (!selectedStation) {
        setSelectedStation(STATIONS[0]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedStation]);

  // 初始加载
  useEffect(() => {
    loadStations();
    // 每 30 秒刷新一次数据
    const interval = setInterval(loadStations, 30000);
    return () => clearInterval(interval);
  }, [loadStations]);

  // Filter stations logic
  const filteredStations = useMemo(() => {
    return stations.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                            s.address.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter ? s.status === filter : true;
      return matchesSearch && matchesFilter;
    });
  }, [stations, search, filter]);

  const toggleFilter = (status: string) => {
    setFilter(prev => prev === status ? null : status);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Paris
    const map = L.map(mapContainerRef.current, {
        center: [48.8566, 2.3522],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
    });

    // Dark Matter Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;

    // Track Cursor
    map.on('mousemove', (e) => {
        setCursorPos({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
        map.remove();
        mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      // Clear existing markers that are not in filtered list
      Object.keys(markersRef.current).forEach(id => {
          if (!filteredStations.find(s => s.id === id)) {
              markersRef.current[id].remove();
              delete markersRef.current[id];
          }
      });

      // Add/Update markers
      filteredStations.forEach(station => {
          if (markersRef.current[station.id]) {
              // Update state if needed (e.g. selection)
              const marker = markersRef.current[station.id];
              const icon = createCustomIcon(station, selectedStation?.id === station.id);
              marker.setIcon(icon);
              marker.setZIndexOffset(selectedStation?.id === station.id ? 1000 : 0);
          } else {
              // Create new marker
              const icon = createCustomIcon(station, selectedStation?.id === station.id);
              const marker = L.marker([station.lat, station.lng], { icon, riseOnHover: true })
                  .addTo(map)
                  .on('click', () => {
                      setSelectedStation(station);
                      // Pan to station slightly offset to accommodate card
                      map.flyTo([station.lat, station.lng], 15, { duration: 1.5 });
                  });
              markersRef.current[station.id] = marker;
          }
      });
  }, [filteredStations, selectedStation]);

  const createCustomIcon = (station: Station, isSelected: boolean) => {
      const statusColor = 
          station.status === 'Available' ? 'bg-emerald-500' :
          station.status === 'Occupied' ? 'bg-rose-500' :
          station.status === 'Reserved' ? 'bg-amber-500' : 'bg-slate-500';
      
      const glowColor = 
          station.status === 'Available' ? 'shadow-[0_0_15px_rgba(16,185,129,0.6)]' :
          station.status === 'Occupied' ? 'shadow-[0_0_15px_rgba(244,63,94,0.6)]' : '';

      return L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="relative flex items-center justify-center w-10 h-10">
                ${(station.status === 'Available' || isSelected) ? `<div class="absolute inset-0 rounded-full ${statusColor} opacity-30 animate-ping"></div>` : ''}
                <div class="relative w-4 h-4 rounded-full border-2 border-white ${statusColor} ${glowColor} transition-all duration-300 ${isSelected ? 'scale-150' : ''}"></div>
                ${isSelected ? `<div class="absolute -bottom-2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white"></div>` : ''}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
      });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetZoom = () => {
      mapInstanceRef.current?.flyTo([48.8566, 2.3522], 13);
      setSelectedStation(null);
  };

  // 创建用户位置标记图标
  const createUserLocationIcon = () => {
    return L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <div class="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
          <div class="absolute inset-2 rounded-full bg-blue-500 opacity-30 animate-pulse"></div>
          <div class="relative w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  // 更新用户位置标记
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserLocationIcon(),
        zIndexOffset: 2000
      }).addTo(mapInstanceRef.current)
        .bindPopup('Your Location');
    }

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [userLocation]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);

        // 飞到用户位置
        mapInstanceRef.current?.flyTo([latitude, longitude], 15, { duration: 1.5 });

        // 加载附近站点（传递用户位置以计算距离）
        fetchStations({
          userLat: latitude,
          userLng: longitude
        }).then(data => {
          if (data.length > 0) {
            setStations(data);
          }
        }).catch(console.error);
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error);
        // 回退到巴黎中心
        mapInstanceRef.current?.flyTo([48.8566, 2.3522], 13);
        alert(`Unable to get your location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  return (
    <div className="flex h-full w-full relative">
      {/* Sidebar List */}
      <aside className="w-full max-w-[400px] h-full flex flex-col z-20 border-r border-border-dark bg-[#101723]/95 backdrop-blur-xl absolute lg:relative transform transition-transform duration-300 -translate-x-full lg:translate-x-0 shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 flex flex-col gap-6 border-b border-border-dark">
            <h2 className="text-white text-lg font-bold font-display">Stations</h2>
            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-text-secondary" size={18} />
                </div>
                <input 
                    className="block w-full rounded-lg border-border-dark bg-surface-dark py-3 pl-10 pr-3 text-sm text-white placeholder-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                    placeholder="Search station ID, address..." 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2">
                {['Available', 'Occupied', 'Reserved', 'Issue'].map(status => (
                    <button 
                        key={status} 
                        onClick={() => toggleFilter(status)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all group ${
                            filter === status 
                            ? 'bg-primary/20 border-primary text-white' 
                            : 'bg-surface-dark border-border-dark text-text-secondary hover:border-primary/50 hover:bg-primary/10 hover:text-white'
                        }`}
                    >
                         <span className={`size-2 rounded-full ${
                             status === 'Available' ? 'bg-emerald-500' :
                             status === 'Occupied' ? 'bg-rose-500' :
                             status === 'Reserved' ? 'bg-amber-500' : 'bg-slate-500'
                         }`}></span>
                         <span className="text-xs font-medium">{status}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* 加载状态 */}
            {isLoading && (
                <div className="flex items-center justify-center h-20 text-text-secondary">
                    <Loader2 className="animate-spin mr-2" size={20} />
                    <span>加载中...</span>
                </div>
            )}
            {/* 错误提示 */}
            {error && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-2 rounded-lg text-xs mb-2">
                    {error}
                </div>
            )}
            {!isLoading && filteredStations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
                    <p>No stations found.</p>
                </div>
            ) : (
                filteredStations.map((station) => (
                    <div 
                        key={station.id}
                        onClick={() => {
                            setSelectedStation(station);
                            mapInstanceRef.current?.flyTo([station.lat, station.lng], 16);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all group ${
                            selectedStation?.id === station.id 
                            ? 'bg-gradient-to-r from-surface-lighter to-[#1e2a3f] border-primary/30 shadow-lg' 
                            : 'bg-transparent border-transparent hover:bg-surface-dark hover:border-border-dark'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center justify-center size-10 rounded-lg bg-surface-lighter ${selectedStation?.id === station.id ? 'text-primary' : 'text-text-secondary'}`}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-sm">{station.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`size-1.5 rounded-full ${
                                        station.status === 'Available' ? 'bg-emerald-500' :
                                        station.status === 'Occupied' ? 'bg-rose-500' :
                                        station.status === 'Reserved' ? 'bg-amber-500' : 'bg-slate-500'
                                    }`}></span>
                                    <p className="text-text-secondary text-xs">{station.distance} • {station.status}</p>
                                </div>
                            </div>
                        </div>
                        <ChevronRight size={18} className={`${selectedStation?.id === station.id ? 'text-primary' : 'text-text-secondary group-hover:text-white'}`} />
                    </div>
                ))
            )}
        </div>
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative bg-[#0B1019] overflow-hidden group/map z-0">
        <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
        
        {/* Overlay Grid Pattern for aesthetics */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{ 
            backgroundImage: 'linear-gradient(#3c83f6 1px, transparent 1px), linear-gradient(90deg, #3c83f6 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}></div>
        
        {/* Top Controls */}
        <div className="absolute top-6 right-6 z-30 flex gap-3 pointer-events-auto">
             <button className="flex items-center justify-center size-10 rounded-lg bg-surface-dark/90 backdrop-blur border border-border-dark text-white shadow-lg hover:bg-surface-lighter transition-colors">
                 <Bell size={20} />
             </button>
             <button className="flex items-center justify-center size-10 rounded-lg bg-surface-dark/90 backdrop-blur border border-border-dark text-white shadow-lg hover:bg-surface-lighter transition-colors">
                 <Layers size={20} />
             </button>
        </div>

        {/* Floating Station Card */}
        {selectedStation && (
            <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 z-40 transition-all duration-300 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 pointer-events-auto">
                 <div className="w-[320px] bg-[#182334]/95 backdrop-blur-md border border-border-dark rounded-2xl shadow-2xl overflow-hidden group">
                    <div className="h-24 bg-cover bg-center relative" style={{ backgroundImage: `url('https://picsum.photos/seed/${selectedStation.id}/400/200')` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#182334] to-transparent opacity-80"></div>
                        <div className="absolute top-3 right-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-sm ${
                                selectedStation.status === 'Available' ? 'bg-emerald-500/80' :
                                selectedStation.status === 'Occupied' ? 'bg-rose-500/80' :
                                selectedStation.status === 'Reserved' ? 'bg-amber-500/80' : 'bg-slate-500/80'
                            }`}>
                                <span className="size-1.5 bg-white rounded-full animate-pulse"></span>
                                {selectedStation.status}
                            </span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedStation(null); }}
                            className="absolute top-3 left-3 size-6 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="p-5 -mt-6 relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h2 className="text-white font-bold text-lg leading-tight">{selectedStation.name}</h2>
                                <p className="text-text-secondary text-xs mt-1 flex items-center gap-1">
                                    <MapPin size={12} />
                                    {selectedStation.address}
                                </p>
                            </div>
                            <button className="text-text-secondary hover:text-red-400 transition-colors bg-surface-dark p-2 rounded-lg border border-border-dark shadow-sm">
                                <Heart size={16} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 mb-4 mt-2">
                            <div className="flex items-center gap-2 text-xs text-text-secondary bg-surface-lighter/50 px-2 py-1.5 rounded border border-white/5 font-mono">
                                <Globe size={12} />
                                {selectedStation.gps}
                            </div>
                        </div>
                        <div className="flex gap-2 mb-5">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-dark rounded border border-border-dark">
                                 <Zap size={14} className="text-primary" />
                                 <span className="text-xs text-gray-300 font-medium">{selectedStation.power}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-dark rounded border border-border-dark">
                                 <span className="text-text-secondary font-mono text-xs">€</span>
                                 <span className="text-xs text-gray-300 font-medium">0.35/kWh</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-dark rounded border border-border-dark">
                                 <NavIcon size={14} className="text-text-secondary" />
                                 <span className="text-xs text-gray-300 font-medium">{selectedStation.distance}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => navigate(`/station/${selectedStation.id}`)}
                                className="flex-1 h-10 flex items-center justify-center rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-primary/25 transition-all transform active:scale-95"
                            >
                                Reserve Now
                            </button>
                            <button className="size-10 flex items-center justify-center rounded-lg bg-bg-dark border border-border-dark text-white hover:bg-surface-lighter transition-colors">
                                <NavIcon size={18} />
                            </button>
                        </div>
                    </div>
                 </div>
                 {/* Pin Pointer */}
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#182334] rotate-45 border-r border-b border-border-dark"></div>
            </div>
        )}

        {/* Bottom Coordinates & Info Bar (GIS Style) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-8 bg-[#101723]/90 backdrop-blur border-t border-border-dark flex items-center px-4 justify-between text-[10px] text-text-secondary font-mono pointer-events-none">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                    <span className="text-primary">LAT:</span> {cursorPos.lat.toFixed(4)}° N
                </div>
                <div className="flex items-center gap-2 w-32">
                    <span className="text-primary">LNG:</span> {cursorPos.lng.toFixed(4)}° E
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Compass size={12} />
                    <span>BEARING: 0° N</span>
                </div>
                <div className="flex items-center gap-1">
                     <div className="w-16 h-1 bg-white/20 relative">
                         <div className="absolute left-0 top-0 bottom-0 bg-white w-1"></div>
                         <div className="absolute right-0 top-0 bottom-0 bg-white w-1"></div>
                     </div>
                     <span>2 km</span>
                </div>
            </div>
        </div>

        {/* Map Controls */}
        <div className="absolute bottom-12 right-6 z-30 flex flex-col gap-2 pointer-events-auto">
             <button 
                onClick={handleResetZoom}
                className="flex size-10 items-center justify-center rounded-lg bg-surface-dark/90 backdrop-blur border border-border-dark text-white shadow-lg hover:bg-surface-lighter transition-colors"
                title="Reset View"
             >
                 <Target size={20} />
             </button>
             <button
                onClick={handleLocate}
                disabled={isLocating}
                className={`flex size-10 items-center justify-center rounded-lg backdrop-blur border shadow-lg transition-colors ${
                  userLocation
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface-dark/90 border-border-dark text-white hover:bg-surface-lighter'
                } ${isLocating ? 'cursor-wait' : ''}`}
                title={userLocation ? 'Your location' : 'Locate Me'}
             >
                 {isLocating ? (
                   <Loader2 size={20} className="animate-spin" />
                 ) : (
                   <NavIcon size={20} />
                 )}
             </button>
             <div className="flex flex-col rounded-lg bg-surface-dark/90 backdrop-blur border border-border-dark shadow-lg overflow-hidden">
                 <button 
                    onClick={handleZoomIn}
                    className="flex size-10 items-center justify-center border-b border-border-dark text-white hover:bg-surface-lighter transition-colors active:bg-primary/20"
                 >
                     <Plus size={20} />
                 </button>
                 <button 
                    onClick={handleZoomOut}
                    className="flex size-10 items-center justify-center text-white hover:bg-surface-lighter transition-colors active:bg-primary/20"
                 >
                     <Minus size={20} />
                 </button>
             </div>
        </div>
      </main>
    </div>
  );
};

export default MapPage;