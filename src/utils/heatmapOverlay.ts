import L from 'leaflet';

export interface HeatPoint {
  lat: number;
  lon: number;
  intensity?: number;
}

export interface HeatmapOptions {
  radius?: number; // Base radius in pixels at zoom 13 (default: 80)
  blur?: number;   // Blur radius relative to radius (default: 55)
  maxOpacity?: number; // Maximum opacity between 0.0 and 1.0 (default: 0.85)
  minOpacity?: number; // Minimum opacity for outer halo (default: 0.12)
  connectSpots?: boolean; // Whether to interpolate corridors between nearby catches
  gradient?: { [key: number]: string };
}

const DEFAULT_GRADIENT: { [key: number]: string } = {
  0.0: 'rgba(0, 0, 0, 0)',
  0.06: 'rgba(2, 132, 199, 0.35)',   // Cool River Blue (wide outer halo)
  0.22: 'rgba(6, 182, 212, 0.60)',   // River Cyan / drift water & connections
  0.46: 'rgba(16, 185, 129, 0.78)',  // Emerald Green / productive zone
  0.70: 'rgba(234, 179, 8, 0.88)',   // Amber Gold
  0.86: 'rgba(249, 115, 22, 0.95)',  // Blaze Orange
  0.96: 'rgba(239, 68, 68, 1.0)',    // High-heat Crimson Red (only at exact catch epicenter)
  1.0: 'rgba(220, 38, 38, 1.0)',     // Deep Hotspot Peak
};

export class HeatmapOverlay extends L.Layer {
  private _activeMap: L.Map | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _points: HeatPoint[] = [];
  private _options: Required<HeatmapOptions>;
  private _palette: Uint8ClampedArray | null = null;
  private _brushCache = new Map<string, HTMLCanvasElement>();
  private _animFrameId: number | null = null;

  constructor(points: HeatPoint[] = [], options: HeatmapOptions = {}) {
    super();
    this._points = points;
    this._options = {
      radius: options.radius ?? 54,
      blur: options.blur ?? 37,
      maxOpacity: options.maxOpacity ?? 0.85,
      minOpacity: options.minOpacity ?? 0.12,
      connectSpots: options.connectSpots ?? true,
      gradient: options.gradient ?? DEFAULT_GRADIENT,
    };
    this._initPalette();
  }

  onAdd(map: L.Map): this {
    this._activeMap = map;
    if (!this._canvas) {
      this._initCanvas();
    }

    // Append to overlayPane
    const panes = map.getPanes();
    panes.overlayPane.appendChild(this._canvas!);

    map.on('moveend', this._reset, this);
    map.on('viewreset', this._reset, this);
    map.on('resize', this._onMapResize, this);

    if (map.options.zoomAnimation && (L.Browser as any).any3d) {
      map.on('zoomanim', this._animateZoom, this);
    }

    this._reset();
    return this;
  }

  onRemove(map: L.Map): this {
    if (this._animFrameId !== null) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }

    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }

    map.off('moveend', this._reset, this);
    map.off('viewreset', this._reset, this);
    map.off('resize', this._onMapResize, this);

    if (map.options.zoomAnimation && (L.Browser as any).any3d) {
      map.off('zoomanim', this._animateZoom, this);
    }

    this._activeMap = null;
    return this;
  }

  setPoints(points: HeatPoint[]): this {
    this._points = points;
    this.redraw();
    return this;
  }

  setOptions(options: Partial<HeatmapOptions>): this {
    if (options.radius !== undefined) this._options.radius = options.radius;
    if (options.blur !== undefined) this._options.blur = options.blur;
    if (options.maxOpacity !== undefined) this._options.maxOpacity = options.maxOpacity;
    if (options.minOpacity !== undefined) this._options.minOpacity = options.minOpacity;
    if (options.connectSpots !== undefined) this._options.connectSpots = options.connectSpots;
    if (options.gradient !== undefined) {
      this._options.gradient = options.gradient;
      this._initPalette();
    }
    this._brushCache.clear();
    this.redraw();
    return this;
  }

  redraw(): this {
    if (this._animFrameId !== null) {
      cancelAnimationFrame(this._animFrameId);
    }
    this._animFrameId = requestAnimationFrame(() => {
      this._animFrameId = null;
      this._draw();
    });
    return this;
  }

  private _initCanvas(): void {
    this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer') as HTMLCanvasElement;
    this._canvas.style.position = 'absolute';
    this._canvas.style.top = '0px';
    this._canvas.style.left = '0px';
    this._canvas.style.pointerEvents = 'none';
    this._canvas.style.zIndex = '350';
    this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });

    if (this._activeMap) {
      const size = this._activeMap.getSize();
      this._canvas.width = size.x;
      this._canvas.height = size.y;
    }
  }

  private _initPalette(): void {
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext('2d');
    if (!pCtx) return;

    const grad = pCtx.createLinearGradient(0, 0, 256, 0);
    const gradStops = this._options.gradient;
    for (const key in gradStops) {
      grad.addColorStop(parseFloat(key), gradStops[key]);
    }

    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 256, 1);
    this._palette = pCtx.getImageData(0, 0, 256, 1).data;
  }

  private _getBrush(radius: number): HTMLCanvasElement {
    const key = `point-${radius}`;
    const cached = this._brushCache.get(key);
    if (cached) return cached;

    const circle = document.createElement('canvas');
    const d = radius * 2;
    circle.width = d;
    circle.height = d;
    const ctx = circle.getContext('2d');
    if (!ctx) return circle;

    // Center epicenter (r=0) reaches 1.0 (crimson red hotspot).
    // The red is strictly confined to a tight radius (~6% of total radius) around the catch GPS point,
    // and then orange, amber, green, cyan, and blue expand out across the rest of the large heat map.
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');       // Exact catch GPS point (Peak Red)
    gradient.addColorStop(0.06, 'rgba(0, 0, 0, 0.95)');   // Transition boundary of Red
    gradient.addColorStop(0.16, 'rgba(0, 0, 0, 0.85)');   // Blaze Orange
    gradient.addColorStop(0.32, 'rgba(0, 0, 0, 0.68)');   // Amber / Yellow
    gradient.addColorStop(0.52, 'rgba(0, 0, 0, 0.44)');   // Emerald Green
    gradient.addColorStop(0.72, 'rgba(0, 0, 0, 0.22)');   // River Cyan
    gradient.addColorStop(0.90, 'rgba(0, 0, 0, 0.08)');   // Sky Blue outer edge
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();

    this._brushCache.set(key, circle);
    return circle;
  }

  private _getCorridorBrush(radius: number): HTMLCanvasElement {
    const key = `corridor-${radius}`;
    const cached = this._brushCache.get(key);
    if (cached) return cached;

    const circle = document.createElement('canvas');
    const d = radius * 2;
    circle.width = d;
    circle.height = d;
    const ctx = circle.getContext('2d');
    if (!ctx) return circle;

    // Corridor brush has capped opacity (peak 0.35) so it creates smooth water drift paths
    // in cyan/green/blue between spots without ever reaching high-heat orange or red.
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    gradient.addColorStop(0.40, 'rgba(0, 0, 0, 0.20)');
    gradient.addColorStop(0.80, 'rgba(0, 0, 0, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();

    this._brushCache.set(key, circle);
    return circle;
  }

  private _animateZoom(e: any): void {
    if (!this._activeMap || !this._canvas) return;
    try {
      const scale = this._activeMap.getZoomScale(e.zoom, this._activeMap.getZoom());
      const offset = (this._activeMap as any)._latLngBoundsToNewLayerBounds(
        this._activeMap.getBounds(),
        e.zoom,
        e.center
      ).min;
      (L.DomUtil as any).setTransform(this._canvas, offset, scale);
    } catch {
      // Gracefully continue if internal Leaflet transforms are unsupported
    }
  }

  private _onMapResize(): void {
    if (!this._activeMap || !this._canvas) return;
    const size = this._activeMap.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    this._reset();
  }

  private _reset(): void {
    if (!this._activeMap || !this._canvas) return;
    const size = this._activeMap.getSize();

    if (this._canvas.width !== size.x || this._canvas.height !== size.y) {
      this._canvas.width = size.x;
      this._canvas.height = size.y;
    }

    // Reposition the canvas relative to the Leaflet overlay pane origin
    const topLeft = this._activeMap.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    this._draw();
  }

  // Fast Haversine approximation in meters
  private _distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private _draw(): void {
    if (!this._activeMap || !this._canvas || !this._ctx || !this._palette) return;

    const width = this._canvas.width;
    const height = this._canvas.height;
    if (width === 0 || height === 0) return;

    this._ctx.clearRect(0, 0, width, height);
    if (this._points.length === 0) return;

    // Dynamically scale point radius based on current map zoom level
    const zoom = this._activeMap.getZoom();
    const scaleFactor = Math.pow(1.18, zoom - 13);
    const radius = Math.round(Math.max(23, Math.min(148, this._options.radius * scaleFactor)));

    const geoBounds = this._activeMap.getBounds();
    const paddedGeoBounds = geoBounds.pad(0.5); // Seamless edge panning

    let pointsDrawn = 0;

    // 1. Draw connecting drift corridors first (low-heat, subtle channels that never turn red)
    if (this._options.connectSpots && this._points.length > 1) {
      const maxBridgeDistanceMeters = 2300;
      const connectedPairs = new Set<string>();
      const corridorRadius = Math.round(radius * 0.75);
      const corridorBrush = this._getCorridorBrush(corridorRadius);

      this._ctx.globalAlpha = 0.40;

      for (let i = 0; i < this._points.length; i++) {
        for (let j = i + 1; j < this._points.length; j++) {
          const p1 = this._points[i];
          const p2 = this._points[j];
          const dist = this._distanceMeters(p1.lat, p1.lon, p2.lat, p2.lon);
          if (dist > 10 && dist <= maxBridgeDistanceMeters) {
            const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
            if (!connectedPairs.has(pairKey)) {
              connectedPairs.add(pairKey);
              const steps = Math.min(14, Math.max(4, Math.round(dist / 160)));
              for (let s = 1; s < steps; s++) {
                const t = s / steps;
                const cLat = p1.lat + (p2.lat - p1.lat) * t;
                const cLon = p1.lon + (p2.lon - p1.lon) * t;
                if (paddedGeoBounds.contains([cLat, cLon])) {
                  const pt = this._activeMap.latLngToContainerPoint([cLat, cLon]);
                  const x = Math.round(pt.x);
                  const y = Math.round(pt.y);
                  this._ctx.drawImage(corridorBrush, x - corridorRadius, y - corridorRadius);
                  pointsDrawn++;
                }
              }
            }
          }
        }
      }
    }

    // 2. Draw actual catch hotspots with full intensity at the epicenter
    // Red is strictly confined to the tight epicenter where the catch occurred;
    // orange, amber, green, cyan, and blue expand out into the surroundings.
    const catchBrush = this._getBrush(radius);
    for (let i = 0; i < this._points.length; i++) {
      const p = this._points[i];
      if (!paddedGeoBounds.contains([p.lat, p.lon])) continue;

      const containerPoint = this._activeMap.latLngToContainerPoint([p.lat, p.lon]);
      const x = Math.round(containerPoint.x);
      const y = Math.round(containerPoint.y);

      this._ctx.globalAlpha = 1.0;
      this._ctx.drawImage(catchBrush, x - radius, y - radius);
      pointsDrawn++;
    }

    if (pointsDrawn === 0) return;

    // 2. Colorize alpha channel using pre-computed gradient palette
    const imgData = this._ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;
    const palette = this._palette;
    const maxOpacity = this._options.maxOpacity;

    for (let i = 3; i < len; i += 4) {
      const alpha = data[i];
      if (alpha > 0) {
        const offset = alpha * 4;
        data[i - 3] = palette[offset];     // Red
        data[i - 2] = palette[offset + 1]; // Green
        data[i - 1] = palette[offset + 2]; // Blue
        data[i] = Math.round(palette[offset + 3] * maxOpacity);
      }
    }

    this._ctx.putImageData(imgData, 0, 0);
  }
}
