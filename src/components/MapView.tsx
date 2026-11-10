import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Crosshair,
  Layers,
  Filter,
  Navigation2,
  Fish,
  SlidersHorizontal,
  RotateCcw,
  MapPin,
  Compass,
  Plus,
  Minus,
  X,
  ChevronRight,
  Scale,
  Ruler,
  Anchor,
  Satellite,
  HardDrive,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Flame,
  ArrowLeft,
} from 'lucide-react';
import { CatchLog, FishingMode, LiveGpsState, MapFilterState, BankedMapInfo, BankingProgress } from '../types';
import { offlineMapService, haversineDistanceMiles } from '../services/offlineMapService';
import {
  getLastKnownLocation,
  saveLastKnownLocation,
  getLastMapCamera,
  saveLastMapCamera,
  isBaitSpecies,
} from '../utils/storage';
import { HeatmapOverlay, HeatPoint } from '../utils/heatmapOverlay';

interface MapViewProps {
  catches: CatchLog[];
  selectedCatch: CatchLog | null;
  onSelectCatch: (log: CatchLog) => void;
  gpsState: LiveGpsState;
  onRefreshGps: () => void;
  currentMode: FishingMode;
  onDropPin: (coords?: { lat: number; lon: number }) => void;
  filterState: MapFilterState;
  onUpdateFilters: (filters: Partial<MapFilterState>) => void;
  focusTarget?: { lat: number; lon: number; zoom?: number; timestamp?: number } | null;
  onClearFocusTarget?: () => void;
  isVisible?: boolean;
  isAnyModalOpen?: boolean;
}

interface ClusterGroup {
  id: string;
  lat: number;
  lon: number;
  catches: CatchLog[];
}

export const MapView: React.FC<MapViewProps> = ({
  catches,
  selectedCatch,
  onSelectCatch,
  gpsState,
  onRefreshGps,
  currentMode,
  onDropPin,
  filterState,
  onUpdateFilters,
  focusTarget,
  onClearFocusTarget,
  isVisible = true,
  isAnyModalOpen = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const hasAutoCenteredGpsRef = useRef(false);

  const [currentZoom, setCurrentZoom] = useState(13);
  const [mapType, setMapType] = useState<'satellite' | 'street' | 'dark' | 'topo' | 'esri'>('satellite');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showCrosshairs, setShowCrosshairs] = useState(false);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [activeCluster, setActiveCluster] = useState<ClusterGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Catch GPS Heat Map Overlay State
  const [showHeatMap, setShowHeatMap] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('ledger_show_heatmap');
      if (stored !== null) return stored === 'true';
      return true; // Default ON so changes are immediately visible
    } catch {
      return true;
    }
  });
  const [showHeatMapSettings, setShowHeatMapSettings] = useState<boolean>(false);
  const [heatOpacity, setHeatOpacity] = useState<number>(0.85);
  const [showPinsOnHeat, setShowPinsOnHeat] = useState<boolean>(true);
  const [heatSpread, setHeatSpread] = useState<'standard' | 'wide' | 'ultra'>(() => {
    try {
      return (localStorage.getItem('ledger_heatmap_spread') as 'standard' | 'wide' | 'ultra') || 'wide';
    } catch {
      return 'wide';
    }
  });
  const [connectSpots, setConnectSpots] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ledger_heatmap_connect') !== 'false';
    } catch {
      return true;
    }
  });
  const [excludeBaitOnHeat, setExcludeBaitOnHeat] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ledger_heatmap_exclude_bait') === 'true';
    } catch {
      return false;
    }
  });
  const heatmapLayerRef = useRef<HeatmapOverlay | null>(null);

  // 50-Mile Offline Map Banking State
  const [bankedInfo, setBankedInfo] = useState<BankedMapInfo>(offlineMapService.getBankedInfo());
  const [bankingProgress, setBankingProgress] = useState<BankingProgress>({
    isBanking: false,
    downloaded: 0,
    total: 0,
    percent: 0,
  });
  const [showOfflineMapCard, setShowOfflineMapCard] = useState(false);
  const [showCoverageCircle, setShowCoverageCircle] = useState(false);
  const bankedCircleLayerRef = useRef<L.Circle | null>(null);

  // GPS verification against banked map center
  const gpsCheck = useMemo(() => {
    return offlineMapService.checkGpsChange(gpsState.lat, gpsState.lon);
  }, [gpsState.lat, gpsState.lon, bankedInfo]);
  const isGpsUnchanged = !gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0 && bankedInfo.status === 'ready';

  // Subscribe to offline map status and progress
  useEffect(() => {
    const unsubInfo = offlineMapService.subscribeInfo((info) => setBankedInfo(info));
    const unsubProg = offlineMapService.subscribeProgress((prog) => setBankingProgress(prog));
    return () => {
      unsubInfo();
      unsubProg();
    };
  }, []);

  // Android hardware back button & Escape key listener for Offline Map Banking Dialog
  const offlineCardOpenRef = useRef(false);
  useEffect(() => {
    if (showOfflineMapCard && !offlineCardOpenRef.current) {
      offlineCardOpenRef.current = true;
      window.history.pushState({ isOfflineMapCardOpen: true }, '');
    } else if (!showOfflineMapCard && offlineCardOpenRef.current) {
      offlineCardOpenRef.current = false;
    }
  }, [showOfflineMapCard]);

  useEffect(() => {
    const handlePopState = () => {
      if (showOfflineMapCard) {
        setShowOfflineMapCard(false);
        offlineCardOpenRef.current = false;
      }
      if (showHeatMapSettings) {
        setShowHeatMapSettings(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showOfflineMapCard) {
          setShowOfflineMapCard(false);
        }
        if (showHeatMapSettings) {
          setShowHeatMapSettings(false);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showOfflineMapCard, showHeatMapSettings]);

  // Update or draw 50-Mile River Coverage Circle on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showCoverageCircle && bankedInfo.timestamp > 0) {
      const radiusMeters = (bankedInfo.radiusMiles || 50) * 1609.34;
      const center: [number, number] = [bankedInfo.centerLat, bankedInfo.centerLon];

      if (!bankedCircleLayerRef.current) {
        bankedCircleLayerRef.current = L.circle(center, {
          radius: radiusMeters,
          color: '#06B6D4',
          fillColor: '#06B6D4',
          fillOpacity: 0.05,
          weight: 2,
          dashArray: '8, 8',
        }).addTo(map);

        bankedCircleLayerRef.current.bindTooltip(
          `<b>50-Mile Offline Banked River Zone</b><br/><span style="font-size:11px">Center: ${bankedInfo.centerLat.toFixed(4)}°, ${bankedInfo.centerLon.toFixed(4)}° (${bankedInfo.tileCount} tiles cached)</span>`,
          { sticky: true, className: 'tactical-tooltip' }
        );
      } else {
        bankedCircleLayerRef.current.setLatLng(center);
        bankedCircleLayerRef.current.setRadius(radiusMeters);
      }
    } else {
      if (bankedCircleLayerRef.current) {
        bankedCircleLayerRef.current.remove();
        bankedCircleLayerRef.current = null;
      }
    }
  }, [showCoverageCircle, bankedInfo]);

  // Determine marker color by species
  const getSpeciesColor = (species: string, isBait: boolean) => {
    if (isBait) return '#84CC16'; // Chartreuse Lime
    if (species.includes('Blue Catfish')) return '#3B82F6'; // Blue
    if (species.includes('Flathead')) return '#F97316'; // Orange / Amber
    if (species.includes('Channel')) return '#14B8A6'; // Teal
    if (species.includes('Bullhead')) return '#A855F7'; // Purple
    if (species.includes('Skipjack') || species.includes('Shad') || species.includes('Bluegill')) return '#84CC16';
    return '#94A3B8';
  };

  // Filter catches according to filterState (strictly catfish catches while bait is hidden)
  const filteredCatches = useMemo(() => {
    return catches.filter(c => {
      // Hide bait spots from tactical map to prevent pollution
      if (c.isBait) return false;
      if (filterState.mode !== 'all' && c.mode !== filterState.mode) return false;
      if (filterState.species.length > 0 && !filterState.species.includes(c.species)) return false;
      if (filterState.baitType.length > 0 && !filterState.baitType.includes(c.baitRig)) return false;
      if (filterState.minWeightLbs > 0 && (c.weightLbs ?? 0) < filterState.minWeightLbs) return false;
      
      if (filterState.dateRange !== 'all') {
        const logDate = new Date(c.timestamp);
        const now = new Date();
        if (filterState.dateRange === 'today') {
          if (logDate.toDateString() !== now.toDateString()) return false;
        } else if (filterState.dateRange === '7days') {
          if (now.getTime() - logDate.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (filterState.dateRange === '30days') {
          if (now.getTime() - logDate.getTime() > 30 * 24 * 60 * 60 * 1000) return false;
        } else if (filterState.dateRange === 'thisYear') {
          if (logDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (filterState.searchQuery) {
        const q = filterState.searchQuery.toLowerCase();
        const matchSpecies = c.species.toLowerCase().includes(q);
        const matchBait = c.baitRig?.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);
        const matchStructure = c.bottomStructure?.toLowerCase().includes(q);
        if (!matchSpecies && !matchBait && !matchNotes && !matchStructure) return false;
      }

      return true;
    });
  }, [catches, filterState]);

  // Heatmap points derived from filtered catches with valid GPS
  const heatmapPoints = useMemo<HeatPoint[]>(() => {
    return filteredCatches
      .filter(c => typeof c.lat === 'number' && typeof c.lon === 'number' && !isNaN(c.lat) && !isNaN(c.lon))
      .filter(c => {
        if (!excludeBaitOnHeat) return true;
        return !c.isBait && !isBaitSpecies(c.species);
      })
      .map(c => ({
        lat: c.lat,
        lon: c.lon,
        intensity: c.weightLbs && c.weightLbs > 0
          ? Math.min(1.0, 0.75 + Math.min(c.weightLbs, 80) / 320)
          : 0.8,
      }));
  }, [filteredCatches, excludeBaitOnHeat]);

  const totalHeatBaitCount = useMemo(() => {
    return filteredCatches.filter(
      c => typeof c.lat === 'number' && typeof c.lon === 'number' && !isNaN(c.lat) && !isNaN(c.lon) && (c.isBait || isBaitSpecies(c.species))
    ).length;
  }, [filteredCatches]);

  // Compute pixel radius based on spread setting (reduced by another 10%)
  const currentHeatRadius = useMemo(() => {
    if (heatSpread === 'ultra') return 74;
    if (heatSpread === 'wide') return 54;
    return 37; // standard
  }, [heatSpread]);

  // Manage Catch GPS Heatmap Layer on Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showHeatMap) {
      if (!heatmapLayerRef.current) {
        const layer = new HeatmapOverlay(heatmapPoints, {
          maxOpacity: heatOpacity,
          radius: currentHeatRadius,
          blur: Math.round(currentHeatRadius * 0.7),
          connectSpots,
        });
        layer.addTo(map);
        heatmapLayerRef.current = layer;
      } else {
        heatmapLayerRef.current.setPoints(heatmapPoints);
        heatmapLayerRef.current.setOptions({
          maxOpacity: heatOpacity,
          radius: currentHeatRadius,
          blur: Math.round(currentHeatRadius * 0.7),
          connectSpots,
        });
      }
    } else {
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.remove();
        heatmapLayerRef.current = null;
      }
    }
  }, [mapReady, showHeatMap, heatmapPoints, heatOpacity, currentHeatRadius, connectSpots]);

  // Distance calculation in meters (Haversine)
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Clustering logic based on map zoom level to prevent pin clutter
  const clusters = useMemo(() => {
    // Dynamic cluster threshold in meters based on zoom
    const thresholdMeters = Math.max(15, 250000 / Math.pow(2, currentZoom));
    const groups: ClusterGroup[] = [];

    filteredCatches.forEach(catchLog => {
      let addedToGroup = false;
      for (const group of groups) {
        const dist = getDistanceMeters(catchLog.lat, catchLog.lon, group.lat, group.lon);
        if (dist <= thresholdMeters) {
          group.catches.push(catchLog);
          // Recenter group centroid
          group.lat = (group.lat * (group.catches.length - 1) + catchLog.lat) / group.catches.length;
          group.lon = (group.lon * (group.catches.length - 1) + catchLog.lon) / group.catches.length;
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push({
          id: `cluster-${catchLog.id}`,
          lat: catchLog.lat,
          lon: catchLog.lon,
          catches: [catchLog],
        });
      }
    });

    return groups;
  }, [filteredCatches, currentZoom]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Smart Auto-Center Priority:
    // 1. Explicit target focus (user tapped a specific catch to inspect)
    // 2. Most recent real catch logged (catches[0])
    // 3. User's persisted last map camera view (if recorded)
    // 4. Active live GPS satellite position
    // 5. Default: Columbus, GA / Chattahoochee River (32.4610, -84.9877)
    const lastCamera = getLastMapCamera();
    const lastLoc = getLastKnownLocation();
    const latestCatch = catches.find(c => !c.id.startsWith('sample-'));
    const initialLat = focusTarget?.lat ?? (latestCatch?.lat ?? (lastCamera?.lat ?? (lastLoc?.lat ?? (gpsState.lat ?? 32.4610))));
    const initialLon = focusTarget?.lon ?? (latestCatch?.lon ?? (lastCamera?.lon ?? (lastLoc?.lon ?? (gpsState.lon ?? -84.9877))));
    const initialZoom = focusTarget?.zoom ?? (lastCamera?.zoom ?? (lastLoc?.zoom ?? (focusTarget || latestCatch ? 15 : 14)));

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 20,
      minZoom: 3,
    });

    // High-Resolution Google Hybrid Satellite with waterways & contours
    const googleSat = L.tileLayer(
      'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      }
    );

    googleSat.addTo(map);
    activeTileLayerRef.current = googleSat;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersLayer;

    // Track map zoom and center on moveend (NOT continuous move to avoid 60fps React render loops)
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Initialize center coordinates immediately
    const initCenter = map.getCenter();
    setCenterCoords({ lat: initCenter.lat, lon: initCenter.lng });

    map.on('moveend', () => {
      const c = map.getCenter();
      setCenterCoords({ lat: c.lat, lon: c.lng });
      // Keep last map camera viewport fresh without overriding real satellite GPS location
      saveLastMapCamera(c.lat, c.lng, map.getZoom());
    });

    // Tap/Click on map to drop pin or dismiss cluster disambiguation sheet
    map.on('click', (e: L.LeafletMouseEvent) => {
      setActiveCluster(null);
      onDropPin({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    // Handle container resizing smoothly
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 350);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      if (heatmapLayerRef.current) {
        heatmapLayerRef.current.remove();
        heatmapLayerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Sync / Auto-Center Map when live GPS locks for the first time in this session
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // If an explicit focus target was specified (e.g. from Logbook), lock auto-center flag
    if (focusTarget) {
      hasAutoCenteredGpsRef.current = true;
      return;
    }

    if (gpsState.lat && gpsState.lon && gpsState.status === 'locked' && gpsState.lastUpdated && !hasAutoCenteredGpsRef.current) {
      hasAutoCenteredGpsRef.current = true;
      const currentCenter = map.getCenter();
      // Distance between map's current center and newly acquired satellite coordinates
      const dist = Math.hypot(currentCenter.lat - gpsState.lat, currentCenter.lng - gpsState.lon);

      // Save verified position as last known location
      saveLastKnownLocation(gpsState.lat, gpsState.lon, Math.max(map.getZoom(), 15));

      // Only fly/pan if the user isn't already looking at this exact coordinate (> ~15 meters)
      if (dist > 0.00015) {
        map.flyTo([gpsState.lat, gpsState.lon], Math.max(map.getZoom(), 15), {
          duration: 1.4,
          easeLinearity: 0.25,
        });
      }
    }
  }, [gpsState.lat, gpsState.lon, gpsState.status, gpsState.lastUpdated, focusTarget]);

  // Update Base Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    let newLayer: L.TileLayer;

    if (mapType === 'satellite') {
      newLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
      });
    } else if (mapType === 'esri') {
      newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
      });
    } else if (mapType === 'dark') {
      newLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
      });
    } else if (mapType === 'topo') {
      newLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 17,
      });
    } else {
      newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
      });
    }

    newLayer.addTo(map);
    activeTileLayerRef.current = newLayer;
  }, [mapType]);

  // Update Live User GPS Marker & Accuracy Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (gpsState.lat && gpsState.lon) {
      const userLatLng: [number, number] = [gpsState.lat, gpsState.lon];

      const userIcon = L.divIcon({
        className: 'user-gps-pin',
        html: `
          <div class="relative flex flex-col items-center justify-center">
            <div class="w-4 h-4 bg-[#F97316] border-2 border-white rounded-full shadow-[0_0_12px_rgba(249,115,22,0.9)] animate-pulse"></div>
            <span class="mt-0.5 text-[9px] font-black bg-[#1E293B] text-white px-1.5 py-0.2 rounded shadow-lg border border-slate-700">YOU</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (!userLocationMarkerRef.current) {
        userLocationMarkerRef.current = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      } else {
        userLocationMarkerRef.current.setLatLng(userLatLng);
      }

      // Accuracy circle
      const acc = gpsState.accuracy ?? 8;
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle(userLatLng, {
          radius: acc,
          color: '#F97316',
          fillColor: '#F97316',
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng(userLatLng);
        userAccuracyCircleRef.current.setRadius(acc);
      }
    }
  }, [gpsState.lat, gpsState.lon, gpsState.accuracy]);

  // Invalidate Map Dimensions when visibility becomes true (tab switched back)
  useEffect(() => {
    if (isVisible && mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      if (focusTarget) {
        mapInstanceRef.current.setView([focusTarget.lat, focusTarget.lon], focusTarget.zoom ?? 17, {
          animate: true,
          duration: 0.3,
        });
      }
    }
  }, [isVisible, focusTarget]);

  // Center & Smooth Pan to Target on Map
  useEffect(() => {
    if (!focusTarget) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Prevent GPS from hijacking camera back after targeting
    hasAutoCenteredGpsRef.current = true;

    const zoomLevel = focusTarget.zoom ?? 17;
    map.invalidateSize();

    // Fast, smooth camera positioning without blocking user gesture inputs
    map.setView([focusTarget.lat, focusTarget.lon], zoomLevel, {
      animate: true,
      duration: 0.3,
    });

    // Unconditionally ensure all map interaction controls are completely active
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();

    // Open tooltip on arrival
    const markerTimeout = setTimeout(() => {
      const markersLayer = markersLayerGroupRef.current;
      if (markersLayer) {
        markersLayer.eachLayer((layer: any) => {
          if (layer.getLatLng && layer.openTooltip) {
            const pos = layer.getLatLng();
            const dist = getDistanceMeters(pos.lat, pos.lng, focusTarget.lat, focusTarget.lon);
            if (dist < 25) {
              layer.openTooltip();
            }
          }
        });
      }
      if (onClearFocusTarget) {
        onClearFocusTarget();
      }
    }, 350);

    return () => clearTimeout(markerTimeout);
  }, [focusTarget, onClearFocusTarget]);

  // Render Marker Clusters & Disambiguation Pin Elements
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerGroupRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // If heat map is active and user chose to hide waypoint pins for unobstructed thermal view
    if (showHeatMap && !showPinsOnHeat) {
      return;
    }

    clusters.forEach(group => {
      const isMulti = group.catches.length > 1;

      if (isMulti) {
        // Multi-Pin Cluster Badge Marker
        const hasBait = group.catches.some(c => c.isBait);
        const hasPredator = group.catches.some(c => !c.isBait);
        const count = group.catches.length;

        const clusterIcon = L.divIcon({
          className: 'tactical-cluster-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
              <div class="w-9 h-9 rounded-full bg-[#1E293B] border-2 ${
                hasBait && hasPredator ? 'border-[#84CC16]' : hasBait ? 'border-[#84CC16]' : 'border-[#F97316]'
              } shadow-[0_0_12px_rgba(0,0,0,0.8)] flex items-center justify-center text-white font-mono font-black text-xs">
                ${count}
              </div>
              <span class="absolute -bottom-4 text-[9px] font-bold text-white bg-slate-950/90 px-1.5 py-0.2 rounded border border-slate-700 whitespace-nowrap shadow">
                ${count} SPOTS
              </span>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([group.lat, group.lon], { icon: clusterIcon });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          // If zoomed out, zoom in; else open mobile bottom disambiguation sheet
          if (map.getZoom() < 17) {
            map.flyTo([group.lat, group.lon], map.getZoom() + 2, { duration: 0.8 });
          } else {
            setActiveCluster(group);
          }
        });

        marker.addTo(markersLayer);
      } else {
        // Single Individual Catch Pin
        const catchLog = group.catches[0];
        const color = getSpeciesColor(catchLog.species, catchLog.isBait);
        const isSelected = selectedCatch?.id === catchLog.id;
        const weightDisplay = catchLog.weightLbs ? `${catchLog.weightLbs}lb` : '';

        const singleIcon = L.divIcon({
          className: 'tactical-single-marker',
          html: `
            <div class="relative flex flex-col items-center cursor-pointer active:scale-95 transition-transform ${isSelected ? 'scale-125 z-50' : ''}">
              <div class="w-4 h-4 border-2 border-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)]" style="background-color: ${color};"></div>
              <span class="mt-0.5 text-[9px] font-bold text-white bg-slate-950/90 px-1.5 py-0.5 rounded shadow-lg border border-slate-700 whitespace-nowrap">
                ${catchLog.species.split(' ')[0]} ${weightDisplay ? `(${weightDisplay})` : ''}
              </span>
            </div>
          `,
          iconSize: [64, 44],
          iconAnchor: [32, 20],
        });

        const marker = L.marker([catchLog.lat, catchLog.lon], { icon: singleIcon });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectCatch(catchLog);
        });

        marker.bindTooltip(
          `
          <div class="p-1 text-xs font-mono">
            <div class="font-bold text-slate-100 flex items-center justify-between gap-1.5">
              <span>${catchLog.species} ${catchLog.weightLbs ? `(${catchLog.weightLbs} lbs)` : ''}</span>
              <span class="text-[9px] ${catchLog.isSynced ? 'text-emerald-400' : 'text-amber-400'} font-bold">
                ${catchLog.isSynced ? '☁️ Synced' : '⚡ Local'}
              </span>
            </div>
            <div class="text-slate-400">${catchLog.baitRig} • ${catchLog.waterDepthFeet}ft</div>
            <div class="text-[10px] text-slate-500">${new Date(catchLog.timestamp).toLocaleDateString()}</div>
          </div>
          `,
          { direction: 'top', offset: [0, -18], opacity: 0.95 }
        );

        marker.addTo(markersLayer);
      }
    });
  }, [clusters, selectedCatch, onSelectCatch, showHeatMap, showPinsOnHeat]);

  // Center on Live GPS Handler
  const handleCenterGps = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (gpsState.lat && gpsState.lon) {
      map.setView([gpsState.lat, gpsState.lon], 16, { animate: true, duration: 0.4 });
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
    }
    // Always trigger active GPS refresh to poll phone hardware for fresh satellite coordinates
    onRefreshGps();
  };

  const handleFitAllCatches = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (filteredCatches.length === 0) {
      if (gpsState.lat && gpsState.lon) {
        map.setView([gpsState.lat, gpsState.lon], 12, { animate: true });
      }
      return;
    }

    const bounds = L.latLngBounds(filteredCatches.map(c => [c.lat, c.lon]));
    if (gpsState.lat && gpsState.lon) {
      bounds.extend([gpsState.lat, gpsState.lon]);
    }
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const map = mapInstanceRef.current;
    if (map) {
      map.stop();
      map.zoomIn(1);
    }
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const map = mapInstanceRef.current;
    if (map) {
      map.stop();
      map.zoomOut(1);
    }
  };

  const activeFiltersCount = (filterState.species.length > 0 ? 1 : 0) + (filterState.mode !== 'all' ? 1 : 0) + (filterState.onlyBait ? 1 : 0);

  return (
    <div id="tactical-map-view" className="relative flex-1 w-full h-full min-h-0 bg-slate-950 overflow-hidden isolate select-none touch-manipulation z-0">
      
      {/* Map Leaflet Container - Absolute inset for 100% full bounds */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Target Reticle Overlay */}
      {showCrosshairs && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[20]">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 border-2 border-[#F97316] rounded-full animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.6)]"></div>
            <div className="absolute w-1 h-5 bg-[#F97316]"></div>
            <div className="absolute h-1 w-5 bg-[#F97316]"></div>
            <div className="absolute -top-7 text-[10px] font-mono font-bold bg-[#1E293B] text-[#F97316] px-2 py-0.5 rounded border border-[#F97316]/50 shadow-lg">
              TARGET LOCK
            </div>
          </div>
        </div>
      )}

      {/* Top Left: Quick Status Chips */}
      <div className="absolute top-3 left-3 z-[25] flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-120px)] pointer-events-auto">
        {/* Heat Map Quick Toggle & Settings */}
        <div className="flex items-center rounded-xl overflow-hidden shadow-xl border border-slate-700 bg-[#1E293B]/90 backdrop-blur transition shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !showHeatMap;
              setShowHeatMap(next);
              if (!next) {
                setShowHeatMapSettings(false);
              }
              try {
                localStorage.setItem('ledger_show_heatmap', String(next));
              } catch {
                // ignore
              }
            }}
            title="Toggle Catch GPS Thermal Heat Map"
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 font-bold text-[11px] sm:text-xs font-mono transition cursor-pointer active:scale-95 ${
              showHeatMap
                ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white font-black shadow-[0_0_15px_rgba(249,115,22,0.6)]'
                : 'text-amber-400 hover:bg-slate-800'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 shrink-0 ${showHeatMap ? 'fill-white text-white' : 'text-amber-400'}`} />
            <span>{showHeatMap ? 'HEAT: ON' : 'HEAT'}</span>
          </button>

          {showHeatMap && (
            <button
              type="button"
              onClick={() => setShowHeatMapSettings(!showHeatMapSettings)}
              title={showHeatMapSettings ? 'Hide Heat Map Settings' : 'Configure Heat Map Settings'}
              className={`px-2 py-1.5 border-l border-amber-400/40 text-white hover:bg-black/20 transition cursor-pointer active:scale-95 flex items-center justify-center ${
                showHeatMapSettings ? 'bg-black/40 text-amber-300' : 'text-white/80'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono shadow-xl backdrop-blur transition border cursor-pointer active:scale-95 shrink-0 ${
            activeFiltersCount > 0
              ? 'bg-[#F97316] text-white border-orange-400 font-bold'
              : 'bg-[#1E293B]/90 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span>FILTERS{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
        </button>

        {/* 50-Mile Offline Map Banking Widget */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowOfflineMapCard(!showOfflineMapCard)}
            title="50-Mile Offline Satellite Map Banking"
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-mono shadow-xl backdrop-blur transition border cursor-pointer active:scale-95 ${
              bankingProgress.isBanking
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold animate-pulse'
                : bankedInfo.status === 'ready' && bankedInfo.tileCount > 0
                ? 'bg-[#1E293B]/90 text-cyan-400 border-cyan-500/50 hover:bg-cyan-950/40 hover:border-cyan-400 font-semibold'
                : 'bg-[#1E293B]/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {bankingProgress.isBanking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span>BANKING {bankingProgress.percent}%</span>
              </>
            ) : bankedInfo.status === 'ready' && bankedInfo.tileCount > 0 ? (
              <>
                <Satellite className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">50-MI BANKED</span>
                <span className="sm:hidden">50-MI</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">BANK 50-MI MAP</span>
                <span className="sm:hidden">50-MI</span>
              </>
            )}
          </button>

          {/* Backdrop for click-outside dismiss */}
          {showOfflineMapCard && (
            <div
              className="fixed inset-0 z-[38] bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
              onClick={() => setShowOfflineMapCard(false)}
              aria-label="Close offline map banking dialog"
            />
          )}

          {/* Offline Map Banking Popover Card (Full Responsive: Fits All Screen Sizes) */}
          {showOfflineMapCard && (
            <div className="fixed inset-x-3 top-14 sm:absolute sm:left-0 sm:top-11 sm:inset-x-auto w-auto sm:w-96 max-w-[calc(100vw-24px)] max-h-[calc(100vh-80px)] overflow-y-auto bg-[#0F172A]/98 border border-cyan-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md z-[40] text-xs font-mono space-y-3 animate-in fade-in zoom-in-95 duration-150 text-slate-200 scrollbar-thin">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
                      <Satellite className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white uppercase text-xs tracking-wider">50-Mile River Bank</h3>
                      <p className="text-[10px] text-slate-400">Offline satellite tiles</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOfflineMapCard(false)}
                    aria-label="Close offline map dialog"
                    className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer border border-slate-700 text-xs font-mono"
                  >
                    <X className="w-4 h-4 text-orange-400" />
                    <span>Back</span>
                  </button>
                </div>

                {/* GPS Verification Status Card */}
                <div className={`p-2.5 rounded-xl border flex items-start gap-2 text-[11px] ${
                  isGpsUnchanged
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0
                    ? 'bg-amber-950/40 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800'
                }`}>
                  {isGpsUnchanged ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0 ? (
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Satellite className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className={`font-bold ${
                      isGpsUnchanged
                        ? 'text-emerald-300'
                        : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0
                        ? 'text-amber-300'
                        : 'text-slate-200'
                    }`}>
                      {isGpsUnchanged
                        ? 'GPS Position Unchanged'
                        : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0
                        ? 'New GPS Location Detected'
                        : 'GPS Location Ready'}
                    </div>
                    <p className="text-[10px] text-slate-300 font-sans leading-tight">
                      {isGpsUnchanged
                        ? `Same launch ramp as last bank (${gpsCheck.distanceMiles.toFixed(2)} mi from center). No update needed — your 50-mile maps are already stored and ready.`
                        : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0
                        ? `Phone GPS has moved ${gpsCheck.distanceMiles.toFixed(1)} miles from your previous bank. Update to bank the new 50-mile radius around this spot.`
                        : 'Tap below to bank high-resolution satellite imagery for a 50-mile radius around your current location.'}
                    </p>
                  </div>
                </div>

                {/* Status Banner */}
                {bankingProgress.isBanking ? (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        Banking 50-Mile Radius...
                      </span>
                      <span>{bankingProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-200"
                        style={{ width: `${bankingProgress.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{bankingProgress.downloaded} / {bankingProgress.total} tiles</span>
                      <button
                        type="button"
                        onClick={() => offlineMapService.cancelBanking()}
                        className="text-red-400 hover:text-red-300 underline font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : bankedInfo.status === 'ready' && bankedInfo.tileCount > 0 ? (
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>50-MILE RADIUS BANKED & READY</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-tight">
                      This 50-mile zone loads seamlessly on the water even in 0-cell service airplane mode.
                    </p>
                    <div className="pt-1 text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800">
                      <div>Cached: <span className="text-white font-bold">{bankedInfo.tileCount} tiles</span> (~{Math.round(bankedInfo.tileCount * 0.025)} MB)</div>
                      <div>Banked Ramp: <span className="text-cyan-300">{bankedInfo.centerLat.toFixed(4)}°, {bankedInfo.centerLon.toFixed(4)}°</span></div>
                      {gpsState.lat && gpsState.lon && (
                        <div>
                          Current distance: <span className="text-amber-300 font-bold">{haversineDistanceMiles(gpsState.lat, gpsState.lon, bankedInfo.centerLat, bankedInfo.centerLon).toFixed(1)} miles</span> from banked center
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>No Banked Area Stored Yet</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans leading-tight">
                      Open from your boat ramp with Wi-Fi or LTE to store a 50-mile radius onto your device for offline river use.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  {isGpsUnchanged ? (
                    <div className="space-y-1.5">
                      <div className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>MAPS CURRENT (GPS UNCHANGED)</span>
                      </div>
                      <button
                        type="button"
                        disabled={bankingProgress.isBanking}
                        onClick={() => {
                          const targetLat = gpsState.lat ?? (centerCoords?.lat ?? bankedInfo.centerLat);
                          const targetLon = gpsState.lon ?? (centerCoords?.lon ?? bankedInfo.centerLon);
                          offlineMapService.bank50MileRadius(targetLat, targetLon, true);
                        }}
                        className="w-full py-1 text-center text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Force Re-download Tiles Anyway
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={bankingProgress.isBanking}
                      onClick={() => {
                        const targetLat = gpsState.lat ?? (centerCoords?.lat ?? bankedInfo.centerLat);
                        const targetLon = gpsState.lon ?? (centerCoords?.lon ?? bankedInfo.centerLon);
                        offlineMapService.bank50MileRadius(targetLat, targetLon, true);
                      }}
                      className="w-full min-h-[42px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>
                        {bankedInfo.tileCount > 0
                          ? `UPDATE 50-MI MAPS FOR NEW GPS (+${gpsCheck.distanceMiles.toFixed(1)} mi)`
                          : 'BANK 50 MILES FROM HERE'}
                      </span>
                    </button>
                  )}

                  <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 pt-1 text-[11px] text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showCoverageCircle}
                        onChange={(e) => setShowCoverageCircle(e.target.checked)}
                        className="rounded accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Show 50-Mi Ring on Map</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bankedInfo.autoBankEnabled}
                        onChange={(e) => offlineMapService.setAutoBankEnabled(e.target.checked)}
                        className="rounded accent-orange-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Auto-Bank on Open</span>
                    </label>
                  </div>

                  {/* Dedicated Bottom Back / Done Action Button */}
                  <div className="pt-2 mt-2 border-t border-slate-800">
                    <button
                      type="button"
                      id="btn-offline-card-done"
                      onClick={() => setShowOfflineMapCard(false)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg ${
                        bankedInfo.status === 'ready' && bankedInfo.tileCount > 0 && !bankingProgress.isBanking
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black border border-emerald-400/50'
                          : bankingProgress.isBanking
                          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {bankedInfo.status === 'ready' && bankedInfo.tileCount > 0 && !bankingProgress.isBanking ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                          <span>DONE — RETURN TO TACTICAL MAP</span>
                        </>
                      ) : bankingProgress.isBanking ? (
                        <>
                          <X className="w-4 h-4 text-amber-400" />
                          <span>CLOSE WINDOW (BANKING CONTINUES IN BACKGROUND)</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="w-4 h-4 text-sky-400" />
                          <span>CLOSE & RETURN TO TACTICAL MAP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>


      {/* Top Right: Zoom & Satellite Layer Menu */}
      <div className="absolute top-3 right-3 z-[25] flex flex-col space-y-2 pointer-events-auto">
        {/* Zoom Controls */}
        <div className="flex flex-col bg-[#1E293B]/95 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#F97316] active:bg-orange-700 transition border-b border-slate-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-10 h-10 flex items-center justify-center text-white hover:bg-[#F97316] active:bg-orange-700 transition cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Map Layers Menu Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Toggle Imagery & Map Layer"
            className={`w-10 h-10 backdrop-blur-md border rounded-xl flex flex-col items-center justify-center shadow-xl transition cursor-pointer active:scale-95 ${
              mapType.includes('sat') || mapType === 'esri'
                ? 'bg-[#F97316] border-orange-400 text-white'
                : 'bg-[#1E293B]/95 border-slate-700 text-sky-400 hover:bg-[#F97316] hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[7px] font-mono font-bold uppercase mt-0.5 leading-none">
              {mapType === 'satellite' ? 'SAT' : mapType === 'dark' ? 'DARK' : mapType === 'topo' ? 'TOPO' : mapType === 'esri' ? 'ESRI' : 'MAP'}
            </span>
          </button>

          {/* Layer Selection Dropdown */}
          {showLayerMenu && (
            <div className="absolute right-0 top-12 w-48 bg-[#1E293B]/95 border border-slate-700 rounded-xl p-2 shadow-2xl backdrop-blur-md z-[35] text-xs font-mono space-y-1">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-700/60">
                Select Map Base
              </div>
              <button
                type="button"
                onClick={() => { setMapType('satellite'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  mapType === 'satellite' ? 'bg-[#F97316] text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🛰️ Hybrid Satellite</span>
                {mapType === 'satellite' && <span className="text-[10px]">●</span>}
              </button>
              <button
                type="button"
                onClick={() => { setMapType('street'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  mapType === 'street' ? 'bg-[#F97316] text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🗺️ Nautical / Street</span>
                {mapType === 'street' && <span className="text-[10px]">●</span>}
              </button>
              <button
                type="button"
                onClick={() => { setMapType('dark'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  mapType === 'dark' ? 'bg-[#F97316] text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🎯 Tactical Dark</span>
                {mapType === 'dark' && <span className="text-[10px]">●</span>}
              </button>
              <button
                type="button"
                onClick={() => { setMapType('topo'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  mapType === 'topo' ? 'bg-[#F97316] text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>⛰️ Topo Contours</span>
                {mapType === 'topo' && <span className="text-[10px]">●</span>}
              </button>
              <button
                type="button"
                onClick={() => { setMapType('esri'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  mapType === 'esri' ? 'bg-[#F97316] text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🌍 ESRI Aerial</span>
                {mapType === 'esri' && <span className="text-[10px]">●</span>}
              </button>

              {/* Overlays Section */}
              <div className="pt-2 mt-1 border-t border-slate-700/60 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Map Overlays
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showHeatMap;
                    setShowHeatMap(next);
                    try {
                      localStorage.setItem('ledger_show_heatmap', String(next));
                    } catch {
                      // ignore
                    }
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                    showHeatMap ? 'bg-[#F97316] text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Flame className={`w-3.5 h-3.5 ${showHeatMap ? 'text-white fill-white' : 'text-amber-400'}`} />
                    <span>Catch GPS Heat Map</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${showHeatMap ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {showHeatMap ? 'ON' : 'OFF'}
                  </span>
                </button>

                {showHeatMap && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !excludeBaitOnHeat;
                        setExcludeBaitOnHeat(next);
                        try {
                          localStorage.setItem('ledger_heatmap_exclude_bait', String(next));
                        } catch {
                          // ignore
                        }
                      }}
                      className={`w-full text-left pl-6 pr-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer text-[11px] ${
                        excludeBaitOnHeat ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Fish className={`w-3 h-3 ${excludeBaitOnHeat ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>Exclude Bait Logs</span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${excludeBaitOnHeat ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                        {excludeBaitOnHeat ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowHeatMapSettings(true);
                        setShowLayerMenu(false);
                      }}
                      className="w-full text-left pl-6 pr-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer text-[11px] text-slate-300 hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3 h-3 text-orange-400" />
                        <span>Adjust Heat Settings</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold">⚙️</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center on Live GPS Coordinates */}
        <button
          type="button"
          onClick={handleCenterGps}
          title="Center Map on Current GPS Coordinates"
          className="w-10 h-10 bg-[#1E293B]/90 backdrop-blur-md border border-slate-700 rounded-xl flex items-center justify-center text-sky-400 hover:text-white hover:bg-[#F97316] shadow-xl transition active:scale-95 cursor-pointer"
        >
          <Navigation2 className="w-4 h-4" />
        </button>

        {/* Fit All Recorded Catches */}
        <button
          type="button"
          onClick={handleFitAllCatches}
          title="Fit All Logged Catches in Frame"
          className="w-10 h-10 bg-[#1E293B]/90 backdrop-blur-md border border-slate-700 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#F97316] shadow-xl transition active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Reticle Toggle */}
        <button
          type="button"
          onClick={() => setShowCrosshairs(!showCrosshairs)}
          title="Toggle Target Crosshair"
          className={`w-10 h-10 backdrop-blur-md border rounded-xl flex items-center justify-center shadow-xl transition active:scale-95 cursor-pointer ${
            showCrosshairs
              ? 'bg-[#F97316] border-orange-400 text-white'
              : 'bg-[#1E293B]/90 border-slate-700 text-slate-300 hover:bg-[#F97316] hover:text-white'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* TACTICAL CATCH GPS HEAT MAP HUD & LEGEND (Only displayed when explicitly opened via settings icon) */}
      {showHeatMap && showHeatMapSettings && (
        <div className="absolute bottom-20 left-3 z-[24] bg-[#0F172A]/98 border border-orange-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-[11px] font-mono text-slate-200 pointer-events-auto max-w-[250px] sm:max-w-[285px] animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400 shrink-0" />
              <span>HEAT SETTINGS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                {heatmapPoints.length} {excludeBaitOnHeat ? 'CATFISH' : 'SPOTS'}
              </span>
              <button
                type="button"
                onClick={() => setShowHeatMapSettings(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
                title="Close settings"
                aria-label="Close heat map settings"
              >
                <X className="w-3.5 h-3.5 text-orange-400" />
              </button>
            </div>
          </div>

          {/* Thermal Gradient Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-yellow-400 via-orange-500 to-red-600 shadow-inner" />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold">
              <span>Low Density</span>
              <span>Hotspot</span>
            </div>
          </div>

          {/* Heat Map Controls */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-2 text-[10px]">
            {/* Exclude Bait Spots Toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none text-slate-300 hover:text-white p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 transition">
              <div className="flex items-center gap-1.5">
                <Fish className={`w-3.5 h-3.5 ${excludeBaitOnHeat ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="font-semibold">Exclude Bait Logs</span>
                {totalHeatBaitCount > 0 && (
                  <span className="text-[9px] text-slate-400">({totalHeatBaitCount})</span>
                )}
              </div>
              <input
                type="checkbox"
                id="heatmap-exclude-bait-hud-checkbox"
                checked={excludeBaitOnHeat}
                onChange={(e) => {
                  const val = e.target.checked;
                  setExcludeBaitOnHeat(val);
                  try {
                    localStorage.setItem('ledger_heatmap_exclude_bait', String(val));
                  } catch {
                    // ignore
                  }
                }}
                className="rounded accent-orange-500 w-3.5 h-3.5 cursor-pointer"
              />
            </label>

            {/* Thermal Spread / Coverage radius */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-slate-400">Coverage:</span>
              <div className="flex items-center gap-1">
                {(['standard', 'wide', 'ultra'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setHeatSpread(mode);
                      try {
                        localStorage.setItem('ledger_heatmap_spread', mode);
                      } catch {
                        // ignore
                      }
                    }}
                    className={`px-1.5 py-0.5 rounded capitalize transition cursor-pointer ${
                      heatSpread === mode
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'standard' ? 'Norm' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Connect Close Logs Toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none text-slate-300">
              <span title="Interpolate continuous thermal river corridors between nearby catches">Connect Close Spots</span>
              <input
                type="checkbox"
                checked={connectSpots}
                onChange={(e) => {
                  const val = e.target.checked;
                  setConnectSpots(val);
                  try {
                    localStorage.setItem('ledger_heatmap_connect', String(val));
                  } catch {
                    // ignore
                  }
                }}
                className="rounded accent-amber-500 w-3.5 h-3.5 cursor-pointer"
              />
            </label>

            <div className="flex items-center justify-between gap-1">
              <span className="text-slate-400">Opacity:</span>
              <div className="flex items-center gap-1">
                {[0.5, 0.75, 1.0].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setHeatOpacity(op)}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                      heatOpacity === op
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {Math.round(op * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer select-none text-slate-300">
              <span>Show Waypoint Pins</span>
              <input
                type="checkbox"
                checked={showPinsOnHeat}
                onChange={(e) => setShowPinsOnHeat(e.target.checked)}
                className="rounded accent-orange-500 w-3.5 h-3.5 cursor-pointer"
              />
            </label>

            {/* Quick Done / Dismiss Button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowHeatMapSettings(false)}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE THUMB ZONE: Floating Primary Action Dock (Only visible on map when no window, drawer, sheet, or modal is active) */}
      {!isAnyModalOpen && !showOfflineMapCard && !showFilterDrawer && !activeCluster && !selectedCatch && (
        <div className="absolute bottom-6 sm:bottom-7 left-1/2 -translate-x-1/2 z-[25] pointer-events-auto flex items-center gap-2 max-w-[92vw] pb-[env(safe-area-inset-bottom)] animate-in fade-in duration-150">
          <button
            type="button"
            id="primary-drop-pin-catch-btn"
            onClick={() => {
              if (showCrosshairs) {
                const liveCenter = mapInstanceRef.current ? mapInstanceRef.current.getCenter() : null;
                const targetLat = liveCenter ? liveCenter.lat : (centerCoords?.lat ?? 32.4610);
                const targetLon = liveCenter ? liveCenter.lng : (centerCoords?.lon ?? -84.9877);
                onDropPin({ lat: targetLat, lon: targetLon });
              } else {
                onDropPin();
              }
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-[#F97316] hover:bg-orange-500 active:scale-95 text-white font-bold text-xs sm:text-sm font-mono shadow-[0_8px_25px_rgba(249,115,22,0.5)] border-2 border-white/90 backdrop-blur transition cursor-pointer whitespace-nowrap select-none shrink-0"
          >
            <MapPin className="w-4 h-4 fill-white shrink-0" />
            <span>{showCrosshairs ? 'Drop Pin At Reticle' : 'Drop Pin & Log Spot'}</span>
          </button>
        </div>
      )}

      {/* CLUSTER PIN DISAMBIGUATION BOTTOM SHEET */}
      {activeCluster && (
        <div className="absolute inset-x-0 bottom-0 z-[30] bg-slate-900/98 border-t border-orange-500/50 rounded-t-2xl shadow-2xl p-4 max-h-[60vh] flex flex-col text-xs font-mono text-slate-100 backdrop-blur-md animate-slideUp">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs border border-orange-500/30">
                {activeCluster.catches.length}
              </span>
              <div>
                <h4 className="font-bold text-white text-sm">Clustered Waypoints</h4>
                <p className="text-[10px] text-slate-400 font-sans">Tap any pin to view log details & telemetry</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveCluster(null)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of clustered pins with touch targets */}
          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {activeCluster.catches.map(catchLog => (
              <div
                key={catchLog.id}
                onClick={() => {
                  onSelectCatch(catchLog);
                  setActiveCluster(null);
                }}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-orange-500/50 active:scale-98 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: getSpeciesColor(catchLog.species, catchLog.isBait) }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white truncate text-xs">{catchLog.species}</span>
                      {catchLog.weightLbs ? (
                        <span className="text-orange-400 font-bold text-[11px]">{catchLog.weightLbs} lbs</span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {catchLog.baitRig} • {catchLog.waterDepthFeet} ft depth • {new Date(catchLog.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Drawer Overlay */}
      {showFilterDrawer && (
        <div className="absolute top-14 left-3 right-3 sm:right-auto z-[1100] sm:w-80 p-4 rounded-2xl bg-[#1E293B]/98 border border-slate-700 shadow-2xl backdrop-blur text-xs font-mono space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#F97316]" />
              Map Pin Filters
            </span>
            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Platform Mode Filter */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Platform Mode</label>
            <div className="grid grid-cols-3 gap-1">
              {(['all', 'boat', 'bank'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdateFilters({ mode: m })}
                  className={`py-1.5 rounded-lg text-center font-bold capitalize transition ${
                    filterState.mode === m
                      ? 'bg-[#F97316] text-white font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Target Species Quick Chips */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Target Species</label>
            <div className="flex flex-wrap gap-1">
              {['Blue Catfish', 'Flathead Catfish', 'Channel Catfish', 'Skipjack Herring', 'Gizzard Shad'].map(sp => {
                const isSelected = filterState.species.includes(sp);
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? filterState.species.filter(s => s !== sp)
                        : [...filterState.species, sp];
                      onUpdateFilters({ species: updated });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                      isSelected
                        ? 'bg-[#F97316] text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sp}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Filters */}
          <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
            <button
              type="button"
              onClick={() => onUpdateFilters({
                species: [],
                baitType: [],
                mode: 'all',
                dateRange: 'all',
                onlyBait: false,
                minWeightLbs: 0,
                searchQuery: '',
              })}
              className="text-[#F97316] hover:underline text-[11px]"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="px-4 py-1.5 rounded-lg bg-[#F97316] text-white font-bold text-xs"
            >
              Apply
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
