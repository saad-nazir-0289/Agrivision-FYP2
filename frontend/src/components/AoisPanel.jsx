import { useEffect, useState } from 'react';
import AoiMap from './AoiMap';
import UserPicker from './UserPicker';
import { api } from '../services/api';

// Turns "lat, lng" lines into [[lat, lng], ...]. Lines that are not two numbers are ignored.
const parse = (text) =>
  text
    .split('\n')
    .map((line) => line.split(',').map((s) => (s.trim() ? Number(s) : NaN)))
    .filter((p) => p.length === 2 && p.every(Number.isFinite));

export default function AoisPanel() {
  const [aois, setAois] = useState([]);
  const [farmers, setFarmers] = useState([]); // active farmers, for the assign checkboxes
  const [name, setName] = useState('');
  const [text, setText] = useState(''); // the points, one "lat, lng" per line
  const [assigned, setAssigned] = useState([]); // farmer ids for the AOI being created
  const [editing, setEditing] = useState(null); // { id, users } while changing an AOI's farmers
  const [place, setPlace] = useState(''); // search box text
  const [bounds, setBounds] = useState(null); // where the map should fly to
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api('/aois')
    .then((d) => setAois(d.aois))
    .catch((err) => setError(err.message));
  }, [reloadKey]);

  useEffect(() => {
    api('/admin/users?status=active')
      .then((d) => setFarmers(d.users.filter((u) => u.role === 'farmer')))
      .catch((err) => setError(err.message));
  }, []);

  // The text box is the single source of truth, so map clicks and typing both work.
  const points = parse(text);
  const addPoint = ({ lat, lng }) =>
    setText((t) => `${t}${t ? '\n' : ''}${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  const undo = () => setText((t) => t.split('\n').slice(0, -1).join('\n'));

  // Looks a place up on OpenStreetMap's free Nominatim service and moves the map there.
  async function search(e) {
    e.preventDefault();
    if (!place.trim()) return;
    setError('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pk&q=${encodeURIComponent(place)}`;
      const [hit] = await (await fetch(url)).json();
      if (!hit) return setError('Place not found, try a nearby city or village');
      const [south, north, west, east] = hit.boundingbox.map(Number);
      setBounds([[south, west], [north, east]]);
    } catch {
      setError('Search failed, check your internet connection');
    }
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter a name for the AOI');
    if (points.length < 3) return setError('Add at least 3 points');

    // GeoJSON wants [lng, lat] and a ring that ends where it starts.
    const ring = points.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]);

    setBusy(true);
    try {
      await api('/aois', {
        method: 'POST',
        body: { name, geometry: { type: 'Polygon', coordinates: [ring] }, assignedUsers: assigned },
      });
      setName('');
      setText('');
      setAssigned([]);
      setReloadKey((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveUsers() {
    try {
      await api(`/aois/${editing.id}/users`, { method: 'PATCH', body: { assignedUsers: editing.users } });
      setEditing(null);
      setReloadKey((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(aoi) {
    if (!window.confirm(`Delete ${aoi.name}?`)) return;
    try {
      await api(`/aois/${aoi._id}`, { method: 'DELETE' });
      setReloadKey((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Areas of interest (AOIs)</h2>
      <p className="muted">Search for a place, zoom in, then click the corners of the field. Or type points as "lat, lng" lines.</p>
      {error && <p className="error" role="alert">{error}</p>}

      <form onSubmit={search} className="toolbar">
        <input type="search" placeholder="Search a city, town or village" aria-label="Search a place"
          value={place} onChange={(e) => setPlace(e.target.value)} />
        <button className="btn-small">Search</button>
      </form>

      <AoiMap aois={aois} points={points} onPick={addPoint} bounds={bounds} />

      <form onSubmit={save} noValidate>
        <label htmlFor="aoiName">AOI name</label>
        <input id="aoiName" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="aoiPoints">Points ({points.length})</label>
        <textarea id="aoiPoints" value={text} onChange={(e) => setText(e.target.value)} placeholder="31.50000, 74.30000" />
        <p className="field-label">Assign to farmers</p>
        <UserPicker farmers={farmers} selected={assigned} onChange={setAssigned} />
        <div className="actions">
          <button className="btn auto" disabled={busy}>{busy ? 'Saving…' : 'Save AOI'}</button>
          <button type="button" className="btn-small" onClick={undo}>Undo last point</button>
          <button type="button" className="btn-small" onClick={() => setText('')}>Clear</button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Area (ha)</th><th>Assigned to</th><th>Action</th></tr>
          </thead>
          <tbody>
            {aois.map((a) => (
              <tr key={a._id}>
                <td>{a.name}</td>
                <td>{a.areaHa}</td>
                <td>
                  {editing?.id === a._id ? (
                    <>
                      <UserPicker farmers={farmers} selected={editing.users} onChange={(users) => setEditing({ id: a._id, users })} />
                      <button className="btn-small" onClick={saveUsers}>Save</button>{' '}
                      <button className="btn-small" onClick={() => setEditing(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      {a.assignedUsers.map((u) => u.name).join(', ') || <span className="muted">Nobody</span>}{' '}
                      <button className="btn-small" onClick={() => setEditing({ id: a._id, users: a.assignedUsers.map((u) => u._id) })}>
                        Edit
                      </button>
                    </>
                  )}
                </td>
                <td><button className="btn-small danger" onClick={() => remove(a)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aois.length === 0 && <p className="muted">No AOIs yet.</p>}
    </div>
  );
}