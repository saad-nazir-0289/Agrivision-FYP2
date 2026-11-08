// NDVI = (NIR - Red) / (NIR + Red), so it always lies between -1 and +1.
// Below 0 there is no vegetation (water, cloud, snow). Plants start above 0 and dense crops reach 0.7 to 0.9.
// One colour scale for the map and the legend, so they always match. [ndvi value, [r, g, b]]
export const STOPS = [
  [-1, [30, 64, 124]], // dark blue: water
  [-0.001, [150, 170, 190]], // grey-blue: cloud, snow
  [0, [215, 48, 39]], // red: bare ground, very little vegetation
  [0.33, [253, 174, 97]], // orange
  [0.5, [254, 224, 139]], // yellow
  [0.66, [166, 217, 106]], // light green
  [1, [26, 152, 80]], // dark green: dense vegetation
];

// Position of a value on the legend bar, as a percentage from the -1 end to the +1 end.
export const legendPos = (v) => Math.round(((v + 1) / 2) * 10000) / 100;

// CSS gradient for the legend bar, built from the same stops.
const gradientStops = STOPS.map(([v, [r, g, b]]) => {
    const color = `rgb(${r}, ${g}, ${b})`;
    const position = legendPos(v);
    return `${color} ${position}%`;
});

export const legendGradient =
    `linear-gradient(to right, ${gradientStops.join(', ')})`;

// Colour of an NDVI value, blended between the two nearest stops. Returns [r, g, b].
export function ndviColor(value) {
  const x = Math.min(1, Math.max(-1, value));
  const i = STOPS.findIndex(([stop]) => x <= stop); // first stop at or above x
  if (i <= 0) return STOPS[0][1];
  const [v0, c0] = STOPS[i - 1];
  const [v1, c1] = STOPS[i];
  const t = (x - v0) / (v1 - v0);
  return c0.map((c, k) => Math.round(c + (c1[k] - c) * t));
}

// Bands: below 0 no vegetation, then the design's 0 to 0.33, 0.33 to 0.66 and above.
export const classify = (v) => {
    let vegetationClass;

    if (v < 0) {
        vegetationClass = 'No vegetation';
    } else if (v < 0.33) {
        vegetationClass = 'Low (Stress)';
    } else if (v < 0.66) {
        vegetationClass = 'Moderate';
    } else {
        vegetationClass = 'Healthy';
    }
    return vegetationClass;
};

// Percentage of the AOI's pixels in each band. Empty (null) cells outside the AOI are ignored,
// and "No vegetation" only appears when some pixel is really that low.
export function shareByClass(pixels) {
  const counts = { 'Low (Stress)': 0, Moderate: 0, Healthy: 0 };
  let total = 0;
  for (const row of pixels) {
    for (const v of row) {
      if (v === null) continue;
      const band = classify(v);
      counts[band] = (counts[band] ?? 0) + 1;
      total++;
    }
  }
  return Object.fromEntries(Object.entries(counts).map(([name, n]) => [name, total ? Math.round((n / total) * 100) : 0]));
}

// NDVI of the pixel under a map position, or null when outside the image or outside the AOI.
export function pixelAt({ south, west, north, east }, pixels, lat, lng) {
  if (lat < south || lat > north || lng < west || lng > east) return null;
  const rows = pixels.length;
  const cols = pixels[0].length;
  const row = Math.min(rows - 1, Math.floor(((north - lat) / (north - south)) * rows)); // row 0 is the north edge
  const col = Math.min(cols - 1, Math.floor(((lng - west) / (east - west)) * cols));
  return pixels[row][col];
}