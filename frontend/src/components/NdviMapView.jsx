import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer,AttributionControl, ImageOverlay, Polygon, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ndviColor } from '../utils/ndvi';

// Draws the grid as a tiny image: one image pixel per NDVI pixel, transparent outside the AOI.
function toImage(pixels) {
  const rows = pixels.length;
  const cols = pixels[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(cols, rows);
  pixels.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === null) return; // stays transparent
      image.data.set([...ndviColor(v), 255], (r * cols + c) * 4);
    })
  );
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

// Zooms the map to the AOI whenever a new result arrives.
function FitTo({ bounds }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { maxZoom: 17 });
  }, [map, bounds]);
  return null;
}

// Reports the pointer position (and taps on touch screens) so the page can look up that pixel.
function Probe({ onProbe }) {
  useMapEvents({
    mousemove: (e) => onProbe(e.latlng),
    click: (e) => onProbe(e.latlng),
    mouseout: () => onProbe(null),
  });
  return null;
}

export default function NdviMapView({ aoi, result, pixels, onProbe }) {
  const { south, west, north, east } = result.bounds;
  const bounds = useMemo(() => [[south, west], [north, east]], [south, west, north, east]);
  const image = useMemo(() => toImage(pixels), [pixels]);
  // GeoJSON stores [lng, lat] but Leaflet wants [lat, lng], so we flip.
  const outline = aoi.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);

  return (
    <MapContainer center={[30.4, 69.3]} zoom={6} className="map map-large" attributionControl={false}>
      <AttributionControl prefix={false} />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      />
      <ImageOverlay url={image} bounds={bounds} opacity={0.85} className="ndvi-overlay" />
      <Polygon positions={outline} pathOptions={{ color: '#ffffff', weight: 2, fill: false, interactive: false }} />
      <FitTo bounds={bounds} />
      <Probe onProbe={onProbe} />
    </MapContainer>
  );
}