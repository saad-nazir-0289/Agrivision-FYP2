import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Calls onPick({ lat, lng }) each time the admin clicks the map.
function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

// Moves the map to the searched place. `bounds` is [[south, west], [north, east]].
function FlyTo({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.flyToBounds(bounds, { maxZoom: 15 });
  }, [bounds, map]);
  return null;
}

// interactive: false lets clicks pass through the shapes to the map underneath.
const saved = { color: '#22c55e', interactive: false };
const drawing = { color: '#f59e0b', interactive: false };

export default function AoiMap({ aois = [], points = [], onPick, bounds }) {
  return (
    <MapContainer center={[30.4, 69.3]} zoom={6} className="map">
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      {/* Transparent layer with city, town and border names on top of the imagery. */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      />

      <ClickHandler onPick={onPick} />
      <FlyTo bounds={bounds} />

      {/* Saved AOIs. GeoJSON stores [lng, lat] but Leaflet wants [lat, lng], so we flip. */}
      {aois.map((a) => (
        <Polygon
          key={a._id}
          positions={a.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])}
          pathOptions={saved}
        />
      ))}

      {/* The polygon being drawn: one dot per point, filled shape once there are 3. */}
      {points.length > 2 && <Polygon positions={points} pathOptions={drawing} />}
      {points.map((p, i) => (
        <CircleMarker key={i} center={p} radius={4} pathOptions={drawing} />
      ))}
    </MapContainer>
  );
}