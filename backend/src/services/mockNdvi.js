// The same AOI + date always gives the same result. Replace this file's output with real model output later.

const METRES_PER_DEGREE = 111320;
const rad = (deg) => 
    (deg * Math.PI) / 180;

// Text -> number (FNV-1a), used to seed the random generator.
function hash(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Seeded random numbers between 0 and 1 . Same seed, same sequence.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ray casting: is the point inside the ring of [lng, lat] points?
function inside(lng, lat, ring) {
  let yes = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) yes = !yes;
  }
  return yes;
}

/**
 * Returns { rows, cols, bounds, pixels, avg, min, max } or null if no pixel falls inside the polygon.
 * pixels is a rows x cols grid, row 0 = north. Cells outside the polygon are null.
 */
export function generateNdvi(geometry, aoiId, date) {
  const ring = geometry.coordinates[0];
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  // Pixel size is 10 m, but never more than 120 pixels along the longer side.
  const widthM = (east - west) * METRES_PER_DEGREE * Math.cos(rad((north + south) / 2));
  const heightM = (north - south) * METRES_PER_DEGREE;
  const cellM = Math.max(10, Math.max(widthM, heightM) / 120);
  const cols = Math.max(1, Math.round(widthM / cellM));
  const rows = Math.max(1, Math.round(heightM / cellM));

  // Fixed for the AOI: its own gentle pattern of greener and drier areas.
  const field = rng(hash(aoiId));
  const waves = Array.from({ length: 3 }, () => ({
    fx: 2 + field() * 4, fy: 2 + field() * 4, px: field() * 6.28, py: field() * 6.28, a: 0.04 + field() * 0.05,
  }));

  // Changes with the date: the season (plus a small daily shift), sometimes a dry "stress" patch, and fine pixel noise.
  const day = rng(hash(`${aoiId}:${date}`));
  const dayOfYear = (Date.parse(`${date}T00:00:00Z`) - Date.UTC(Number(date.slice(0, 4)), 0, 0)) / 86400000;
  const season = 0.5 + 0.2 * Math.sin((2 * Math.PI * (dayOfYear - 60)) / 365) + (day() - 0.5) * 0.05; // about 0.3 to 0.7, shifted a little each day
  const hasStress = day() < 0.35;
  const patch = { u: day(), v: day(), r: 0.15 + day() * 0.15, depth: 0.2 + day() * 0.2 };

  const dLng = (east - west) / cols;
  const dLat = (north - south) / rows;
  const pixels = [];
  let sum = 0, count = 0, min = 1, max = -1;

  for (let r = 0; r < rows; r++) {
    const lat = north - (r + 0.5) * dLat;
    const v = (lat - south) / (north - south);
    const row = [];
    for (let c = 0; c < cols; c++) {
      const lng = west + (c + 0.5) * dLng;
      if (!inside(lng, lat, ring)) {
        row.push(null);
        continue;
      }
      const u = (lng - west) / (east - west);
      let ndvi = season;
      for (const w of waves) ndvi += w.a * Math.sin(w.fx * u * 6.28 + w.px) * Math.cos(w.fy * v * 6.28 + w.py);
      if (hasStress) ndvi -= patch.depth * Math.max(0, 1 - Math.hypot(u - patch.u, v - patch.v) / patch.r);
      ndvi += (day() - 0.5) * 0.06;
      ndvi = Math.round(Math.min(0.95, Math.max(0.05, ndvi)) * 1000) / 1000;

      row.push(ndvi);
      sum += ndvi;
      count++;
      min = Math.min(min, ndvi);
      max = Math.max(max, ndvi);
    }
    pixels.push(row);
  }

  if (count === 0) return null;
  return { rows, cols, bounds: { south, west, north, east }, pixels, avg: Math.round((sum / count) * 1000) / 1000, min, max };
}