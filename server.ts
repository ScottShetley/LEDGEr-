import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy-initialized Gemini API client (server-side only)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Robust Tactical Quote Generator with Multi-Model Fallback & Heuristic Synthesis
function generateContextualScoutQuote(data: any): string {
  const env = data.environmentalSnapshot || {};
  const species = data.species || 'Catfish';
  const weight = data.weightLbs ? `${data.weightLbs} lb ` : '';
  const depth = data.waterDepthFeet ? `${data.waterDepthFeet}ft` : 'deep water';
  const flow = env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'heavy current';
  const bait = data.baitRig || 'fresh cut bait';
  const moon = env.moonPhaseName || 'the moon';
  const baro = env.pressureTrend === 'falling' ? 'falling barometer' : 'stable high pressure';

  const templates = [
    `Doubled the rod over at ${depth} on ${bait} as ${flow} pushed hard along the channel ledge under ${moon}.`,
    `Trophy ${weight}${species} slammed ${bait} right in the main current seam during a peak ${env.solunarRating || 'major'} feed window.`,
    `Screaming clicker in ${depth} wash hole—hookset buried deep with ${flow} holding steady on a ${baro}.`,
    `Thumping takedown right off the structure bend at ${depth}; ${bait} did the job with ${moon} overhead.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// API Route: Generate authentic tactical Angler Scouting Narrative & Quote
app.post('/api/generate-quote', async (req, res) => {
  const {
    species,
    weightLbs,
    lengthInches,
    baitRig,
    presentation,
    waterDepthFeet,
    current,
    bottomStructure,
    waterClarity,
    mode,
    notes,
    environmentalSnapshot,
  } = req.body;

  const env = environmentalSnapshot || {};
  
  // Construct rich telemetry context for Gemini
  const telemetryContext = `
Catch Data:
- Species: ${species || 'Catfish'}
- Weight: ${weightLbs ? `${weightLbs} lbs` : 'Not recorded'}
- Length: ${lengthInches ? `${lengthInches} inches` : 'Not recorded'}
- Fishing Mode: ${mode === 'boat' ? 'Boat Operation' : 'Bank Ops'}
- Bait/Rig: ${baitRig || 'Cut bait'}
- Presentation: ${presentation || 'Bottom Rig'}
- Water Depth: ${waterDepthFeet ? `${waterDepthFeet} ft` : 'Deep water'}
- River Current: ${current || 'Moderate'}
- Structure: ${bottomStructure || 'River Channel'}
- Water Clarity: ${waterClarity || 'Muddy'}
- User Field Notes: ${notes || 'None provided'}
- Moon Phase: ${env.moonPhaseName || 'Full/Gibbous'} (Illumination: ${env.moonIlluminationPercent ?? 'High'}%)
- Solunar Period: ${env.solunarRating || 'Major Feed'}
- Barometric Pressure: ${env.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg (${env.pressureTrend || 'steady'})` : '29.98 inHg'}
- USGS River Streamflow: ${env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'Steady flow'}
- Air Temp: ${env.airTempF ? `${env.airTempF}°F` : '75°F'}
- River System: Chattahoochee River River Ops
`;

  const systemInstruction = `You are a legendary veteran Chattahoochee River catfisherman and tactical river scout (BIGGUY_littleboat).
Your job is to generate a short, gritty, authentic 1-2 sentence "Scouting Report & Angler Quote" for the back of an official collectible Catfish Baseball / Trophy Card.

Guidelines:
1. Tone: Gritty, authentic river veteran, tactical, genuine angler vocabulary (e.g. "thumping rod tip", "screaming clicker", "heavy current seam", "deep wash hole", "fresh cut slab", "solid hookset").
2. Content: Blend the real environmental telemetry (flow rate, moon/solunar, depth, bait) with vivid action describing how the fish hit or the conditions that produced it.
3. Length: Exactly 1 to 2 punchy sentences (under 38 words total) so it fits nicely on a baseball card back.
4. Output format: Return ONLY the raw quote string. Do not wrap in quotes or add markdown formatting.`;

  // Try models with fallback sequence in case of 503 / high demand spikes
  const candidateModels = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-2.5-pro'];
  let generatedQuote = '';

  const ai = getGeminiClient();

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Generate an authentic baseball card scouting quote based on this river telemetry:\n${telemetryContext}`,
        config: {
          systemInstruction,
          temperature: 0.85,
        },
      });

      const quoteText = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : '';
      if (quoteText) {
        generatedQuote = quoteText;
        break;
      }
    } catch (err: any) {
      console.warn(`Model ${modelName} error (will attempt fallback):`, err?.message || err);
      // Continue to next model in candidate list
    }
  }

  // If all live API attempts fail or hit 503 high demand, use the contextual river scout generator
  if (!generatedQuote) {
    generatedQuote = generateContextualScoutQuote(req.body);
  }

  res.json({
    success: true,
    quote: generatedQuote,
  });
});

// Cloud Storage & Synced Catch Data Directories
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DATA_DIR = path.join(process.cwd(), 'data');
const SYNCED_DB_FILE = path.join(DATA_DIR, 'synced_catches.json');
const PHOTO_BACKUP_FILE = path.join(DATA_DIR, 'photos_backup.json');

// Ensure storage directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Resilient photo serving: if file was wiped from /uploads on container restart, reconstruct from backup
app.get('/uploads/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOADS_DIR, filename);

  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');

  if (!fs.existsSync(filePath)) {
    try {
      if (fs.existsSync(PHOTO_BACKUP_FILE)) {
        const backupData = JSON.parse(fs.readFileSync(PHOTO_BACKUP_FILE, 'utf-8'));
        // Try exact match or match by filename substring
        const matchedKey = backupData[filename]
          ? filename
          : Object.keys(backupData).find((k) => k.includes(filename) || filename.includes(k));

        if (matchedKey && backupData[matchedKey]) {
          const buf = Buffer.from(backupData[matchedKey], 'base64');
          fs.writeFileSync(filePath, buf);
        }
      }
    } catch (restoreErr) {
      console.warn('Could not restore photo from backup:', restoreErr);
    }
  }
  next();
});

// Serve uploaded photos statically with Cross-Origin headers
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    maxAge: '7d',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// API Route: Get individual catch photo backup by catch ID
app.get('/api/photo-backup/:catchId', (req, res) => {
  try {
    const rawId = req.params.catchId || '';
    const cleanId = rawId.replace(/^(catch-|photo-)/, '');

    let backupMap: Record<string, string> = {};
    if (fs.existsSync(PHOTO_BACKUP_FILE)) {
      try {
        backupMap = JSON.parse(fs.readFileSync(PHOTO_BACKUP_FILE, 'utf-8'));
      } catch (e) {
        console.warn('Error reading PHOTO_BACKUP_FILE:', e);
      }
    }

    // 1. Check exact key or matching key in backupMap
    const matchedKey =
      backupMap[rawId]
        ? rawId
        : backupMap[cleanId]
        ? cleanId
        : Object.keys(backupMap).find(
            (k) =>
              k === rawId ||
              k === cleanId ||
              k.includes(rawId) ||
              (cleanId && k.includes(cleanId))
          );

    if (matchedKey && backupMap[matchedKey]) {
      return res.json({
        success: true,
        found: true,
        filename: matchedKey,
        dataUrl: `data:image/jpeg;base64,${backupMap[matchedKey]}`,
        photoUrl: `/uploads/${matchedKey}`,
      });
    }

    // 2. Check if on disk in uploads/
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      const match = files.find(
        (f) => f.includes(rawId) || (cleanId && f.includes(cleanId))
      );
      if (match) {
        const buf = fs.readFileSync(path.join(UPLOADS_DIR, match));
        return res.json({
          success: true,
          found: true,
          filename: match,
          dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
          photoUrl: `/uploads/${match}`,
        });
      }
    }

    // 3. Check if stored in synced catches
    const serverCatches = loadServerCatches();
    const serverCatch = serverCatches.find(
      (c) => c.id === rawId || c.id === cleanId || (cleanId && c.id && c.id.includes(cleanId))
    );
    if (serverCatch?.photoUrl) {
      if (serverCatch.photoUrl.startsWith('data:image/')) {
        return res.json({
          success: true,
          found: true,
          filename: `catch_${serverCatch.id}.jpg`,
          dataUrl: serverCatch.photoUrl,
          photoUrl: serverCatch.photoUrl,
        });
      } else if (serverCatch.photoUrl.startsWith('/uploads/')) {
        const fn = serverCatch.photoUrl.replace('/uploads/', '');
        const p = path.join(UPLOADS_DIR, fn);
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          return res.json({
            success: true,
            found: true,
            filename: fn,
            dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
            photoUrl: serverCatch.photoUrl,
          });
        }
      }
    }

    // 4. Return HTTP 200 with found: false so client receives a clean response
    // without the browser DevTools Console throwing a loud red 404 network error
    return res.status(200).json({
      success: true,
      found: false,
      message: 'Photo backup not found for this catch',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Route: Get all photo backups for automatic client-side photo restoration
app.get('/api/all-photos-backup', (req, res) => {
  try {
    let backupMap: Record<string, string> = {};
    if (fs.existsSync(PHOTO_BACKUP_FILE)) {
      backupMap = JSON.parse(fs.readFileSync(PHOTO_BACKUP_FILE, 'utf-8'));
    }
    res.json({
      success: true,
      photos: backupMap,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to load synced catches from server store
function loadServerCatches(): any[] {
  try {
    if (fs.existsSync(SYNCED_DB_FILE)) {
      const content = fs.readFileSync(SYNCED_DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading synced database:', err);
  }
  return [];
}

// Helper to save synced catches to server store
function saveServerCatches(catches: any[]): void {
  try {
    fs.writeFileSync(SYNCED_DB_FILE, JSON.stringify(catches, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to synced database:', err);
  }
}

// API Route: Upload photo file and return permanent URL
app.post('/api/upload-photo', (req, res) => {
  try {
    const { photoData, catchId, fileName } = req.body;
    if (!photoData || typeof photoData !== 'string') {
      return res.status(400).json({ success: false, error: 'No photo data provided' });
    }

    // Extract base64 payload
    let ext = 'jpg';
    let base64String = photoData;

    if (photoData.startsWith('data:image/')) {
      const match = photoData.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        ext = match[1].replace('jpeg', 'jpg');
        base64String = match[2];
      }
    }

    const safeCatchId = (catchId || 'catch').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = fileName || `trophy-${safeCatchId}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    const buffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Save backup to survive container restarts
    try {
      let backupMap: Record<string, string> = {};
      if (fs.existsSync(PHOTO_BACKUP_FILE)) {
        backupMap = JSON.parse(fs.readFileSync(PHOTO_BACKUP_FILE, 'utf-8'));
      }
      backupMap[filename] = base64String;
      if (catchId) {
        backupMap[catchId] = base64String;
        backupMap[safeCatchId] = base64String;
        const cleanId = catchId.replace(/^(catch-|photo-)/, '');
        if (cleanId) {
          backupMap[cleanId] = base64String;
        }
      }
      fs.writeFileSync(PHOTO_BACKUP_FILE, JSON.stringify(backupMap, null, 2), 'utf-8');
    } catch (backupErr) {
      console.warn('Could not save photo to backup file:', backupErr);
    }

    const permanentUrl = `/uploads/${filename}`;
    res.json({
      success: true,
      photoUrl: permanentUrl,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('Failed to upload photo:', err);
    res.status(500).json({ success: false, error: err.message || 'Photo upload failed' });
  }
});

// API Route: Background Cloud Catch Sync
app.post('/api/sync-catches', (req, res) => {
  try {
    const { catches } = req.body;
    if (!Array.isArray(catches) || catches.length === 0) {
      return res.json({ success: true, syncedCount: 0, syncedIds: [], syncedAt: Date.now() });
    }

    const serverCatches = loadServerCatches();
    const catchMap = new Map<string, any>(serverCatches.map((c) => [c.id, c]));

    const syncedIds: string[] = [];
    const now = Date.now();

    let backupMapChanged = false;
    let backupMap: Record<string, string> = {};
    if (fs.existsSync(PHOTO_BACKUP_FILE)) {
      try {
        backupMap = JSON.parse(fs.readFileSync(PHOTO_BACKUP_FILE, 'utf-8'));
      } catch {}
    }

    for (const item of catches) {
      const record = {
        ...item,
        isSynced: true,
        syncedAt: now,
      };
      catchMap.set(record.id, record);
      syncedIds.push(record.id);

      // Auto-backup any inline base64 photos from synced catch records
      if (item.photoUrl && typeof item.photoUrl === 'string' && item.photoUrl.startsWith('data:image/')) {
        try {
          const cleanBase64 = item.photoUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
          const filename = `catch_${item.id}.jpg`;
          backupMap[filename] = cleanBase64;
          backupMap[item.id] = cleanBase64;
          const cleanId = String(item.id).replace(/^(catch-|photo-)/, '');
          if (cleanId) {
            backupMap[cleanId] = cleanBase64;
          }
          backupMapChanged = true;

          const filePath = path.join(UPLOADS_DIR, filename);
          fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
        } catch (backupErr) {
          console.warn('Could not auto-backup synced catch photo:', backupErr);
        }
      }
    }

    if (backupMapChanged) {
      try {
        fs.writeFileSync(PHOTO_BACKUP_FILE, JSON.stringify(backupMap, null, 2), 'utf-8');
      } catch (e) {
        console.warn('Could not write updated photo backup:', e);
      }
    }

    const updatedList = Array.from(catchMap.values());
    saveServerCatches(updatedList);

    res.json({
      success: true,
      syncedCount: syncedIds.length,
      syncedIds,
      syncedAt: now,
      totalServerRecords: updatedList.length,
    });
  } catch (err: any) {
    console.error('Failed to sync catches:', err);
    res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
});

// API Route: Get all cloud-synced catches
app.get('/api/sync-catches', (req, res) => {
  try {
    const serverCatches = loadServerCatches();
    res.json({
      success: true,
      catches: serverCatches,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'BIGGUY_littleboat API' });
});

// Privacy Policy endpoints (Required for Google Play Store compliance)
app.get(['/privacy', '/privacy-policy'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'privacy.html'));
});

// Serve Digital Asset Links for Android Trusted Web Activity (TWA) verification
app.use('/.well-known', express.static(path.join(process.cwd(), 'public', '.well-known')));


// Development / Production Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tactical River Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
