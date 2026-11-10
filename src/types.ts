export type FishingMode = 'boat' | 'bank';

export type SpeciesCategory = 
  | 'Blue Catfish'
  | 'Flathead Catfish'
  | 'Channel Catfish'
  | 'Bullhead'
  | 'Skipjack Herring'
  | 'Gizzard Shad'
  | 'Threadfin Shad'
  | 'Bluegill / Sunfish'
  | 'Crappie (Black / White)'
  | 'White Bass'
  | 'Largemouth Bass'
  | 'Carp (Common / Grass / Asian)'
  | 'Mooneye / Goldeye'
  | 'Asian / Silver Carp'
  | 'Gar'
  | 'Freshwater Drum'
  | 'Other';

export type BaitRigType =
  | 'Cut Skipjack Head'
  | 'Cut Skipjack Chunk'
  | 'Cut Bluegill'
  | 'Live Shad'
  | 'Live Gizzard Shad'
  | 'Cut Gizzard Shad'
  | 'Live Threadfin Shad'
  | 'Cut Threadfin Shad'
  | 'Live Bluegill'
  | 'Largemouth Bass (Live / Cut)'
  | 'Cut Carp / Carp Chunk'
  | 'Crappie (Live / Cut)'
  | 'White Bass (Cut / Live)'
  | 'Dip / Prepared Bait'
  | 'Nightcrawler'
  | 'Custom';

// Unified Catfish Presentations for both Boat and Bank
export type UnifiedPresentation =
  | 'Santee Cooper Rig'
  | 'Bumping Bottom'
  | 'Drifting / Dragging Boards'
  | 'Carolina Slip-Sinker'
  | 'Suspended / Down-Rod'
  | '3-Way Swivel Drop Rig'
  | 'Slip Bobber / Float'
  | 'Anchored Bottom Spread';

// Dedicated Bait Gathering Methods
export type BaitCollectionMethod =
  | 'Sabiki Rig / Jigs'
  | 'Cast Net (8ft/10ft)'
  | 'Dip Net / Scoop'
  | 'Crankbait / Small Spoon'
  | 'Worm & Small Hook (#6)'
  | 'Umbrella / Drop Net'
  | 'Snagging'
  | 'Other / Custom';

export type BaitAbundance =
  | 'Abundant / Boiling'
  | 'Steady Bites'
  | 'Scattered / Slow'
  | 'Hard to Find';

export type BaitSizeProfile =
  | 'Small (3-5 in)'
  | 'Medium (6-8 in)'
  | 'Jumbo / Tanker (9-14 in)'
  | 'Mixed Sizes';

export type CurrentCondition =
  | 'Slack'
  | 'Gentle'
  | 'Moderate'
  | 'Heavy / Boiled'
  | 'Eddy / Seam';

export type BottomStructure =
  | 'Ledge / Channel Edge'
  | 'Deep Hole'
  | 'Logjam / Timber'
  | 'Hump / Sandbar'
  | 'Mud Flat';

export type WaterClarity = 'Muddy' | 'Stained' | 'Clear';

export type SolunarPeriodType = 'Major' | 'Minor' | 'Inactive';

export interface SolunarPeriod {
  type: 'Major' | 'Minor';
  start: string; // HH:mm
  end: string;   // HH:mm
  description: string;
  isActiveNow: boolean;
}

export interface SolunarData {
  moonPhaseName: string;
  moonIlluminationPercent: number;
  moonAgeDays: number;
  majorPeriods: SolunarPeriod[];
  minorPeriods: SolunarPeriod[];
  currentRating: SolunarPeriodType;
  currentWindowDesc: string;
  dayRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface EnvironmentalSnapshot {
  airTempF?: number;
  pressureInHg?: number;
  pressureTrend?: 'rising' | 'falling' | 'steady';
  windSpeedMph?: number;
  windDirectionDeg?: number;
  windDirectionCompass?: string;
  humidityPercent?: number;
  cloudCoverPercent?: number;
  usgsFlowCfs?: number;
  usgsStageFt?: number;
  usgsWaterTempF?: number;
  usgsSiteName?: string;
  usgsSiteId?: string;
  solunarRating?: SolunarPeriodType;
  moonPhaseName?: string;
  moonIlluminationPercent?: number;
  isOfflineQueued?: boolean;
  fetchedAt?: number;
}

export interface CatchLog {
  id: string;
  timestamp: number; // Date.now()
  lat: number;
  lon: number;
  accuracyMeters?: number;
  mode: FishingMode;
  species: SpeciesCategory;
  isBait: boolean;
  baitRig: BaitRigType | string;
  presentation: string;
  waterDepthFeet: number;
  current: CurrentCondition;
  bottomStructure: BottomStructure;
  waterClarity: WaterClarity;
  weightLbs?: number;
  lengthInches?: number;
  notes?: string;
  photoUrl?: string;
  photoBlobId?: string;
  photoFit?: 'cover' | 'contain';
  photoPosition?: 'top' | 'center' | 'bottom';
  photoRotation?: number;
  isSynced?: boolean;
  syncedAt?: number;
  syncError?: string;
  photoSizeBytes?: number;
  environmentalSnapshot: EnvironmentalSnapshot;
  title?: string;
}

export type SyncState = 'synced' | 'offline_pending' | 'syncing' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  isOnline: boolean;
  unsyncedCount: number;
  totalCount: number;
  lastSyncedAt: number | null;
  isSyncing: boolean;
}

export interface StoredPhotoRecord {
  id: string;
  catchId: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  isSynced: boolean;
  permanentUrl?: string;
}

export interface MapFilterState {
  species: string[];
  baitType: string[];
  mode: 'all' | 'boat' | 'bank';
  dateRange: 'all' | 'today' | '7days' | '30days' | 'thisYear';
  onlyBait: boolean;
  minWeightLbs: number;
  searchQuery: string;
}

export interface LiveGpsState {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  heading: number | null;
  speedMph: number | null;
  status: 'searching' | 'locked' | 'denied' | 'idle' | 'simulated';
  lastUpdated: number | null;
  error?: string;
}

export interface BankedMapInfo {
  centerLat: number;
  centerLon: number;
  radiusMiles: number;
  timestamp: number;
  tileCount: number;
  status: 'idle' | 'banking' | 'ready' | 'error';
  autoBankEnabled: boolean;
  lastBankedLat?: number;
  lastBankedLon?: number;
  gpsChangeThresholdMiles?: number;
}

export interface GpsChangeStatus {
  hasGpsChanged: boolean;
  distanceMiles: number;
  thresholdMiles: number;
  lastBankedLat: number | null;
  lastBankedLon: number | null;
  currentLat: number | null;
  currentLon: number | null;
  statusText: string;
}

export interface BankingProgress {
  isBanking: boolean;
  downloaded: number;
  total: number;
  percent: number;
  currentZoom?: number;
  error?: string;
}
