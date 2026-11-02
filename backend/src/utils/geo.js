// Approximate bounding box of Pakistan. It rejects clearly wrong areas, not exact borders.
const PAKISTAN = { minLng: 60.8, maxLng: 77.9, minLat: 23.5, maxLat: 37.1 };
const EARTH_RADIUS = 6378137; // metres
const rad = (deg) => (deg * Math.PI) / 180;

// Area in hectares of a closed ring of [lng, lat] points (spherical approximation).
export function areaHectares(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    sum += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return (Math.abs(sum) * EARTH_RADIUS ** 2) / 2 / 10000;
}

// Returns { error } or { areaHa } for a GeoJSON Polygon.
export function validatePolygon(geometry) {
  if (geometry?.type !== 'Polygon' || geometry.coordinates?.length !== 1) {
    return { error: 'Geometry must be a Polygon with one ring' };
  }
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) return { error: 'Add at least 3 points' };

  const numeric = ring.every(
    (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
  if (!numeric) return { error: 'Coordinates must be [longitude, latitude] numbers' };

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return { error: 'Polygon must be closed' };

  const inside = ring.every(
    ([lng, lat]) => lng >= PAKISTAN.minLng && lng <= PAKISTAN.maxLng && lat >= PAKISTAN.minLat && lat <= PAKISTAN.maxLat
  );
  if (!inside) return { error: 'AOI must be inside Pakistan' };

  const areaHa = areaHectares(ring);
  if (areaHa < 0.01) return { error: 'AOI is too small, or its points are in a straight line' };
  return { areaHa: Math.round(areaHa * 10) / 10 };
}