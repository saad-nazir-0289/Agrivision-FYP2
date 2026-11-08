import { useEffect, useState } from 'react';
import NdviLegend from '../components/NdviLegend';
import NdviMapView from '../components/NdviMapView';
import { api } from '../services/api';
import { classify, pixelAt, shareByClass } from '../utils/ndvi';

// The server refuses dates after today in UTC, so the page uses the same UTC "today".
const today = () => new Date().toISOString().slice(0, 10);

export default function NdviMap() {
  const [aois, setAois] = useState(null); // null while loading
  const [aoiId, setAoiId] = useState('');
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null); // { result, pixels }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [probe, setProbe] = useState(null); // { lat, lng } under the pointer

  // 1. Load this farmer's own AOIs once and pick the first one.
  useEffect(() => {
    api('/aois')
      .then((d) => {
        setAois(d.aois);
        if (d.aois[0]) setAoiId(d.aois[0]._id);
      })
      .catch((err) => {
        setAois([]);
        setError(err.message);
      });
  }, []);

  // 2. Whenever the AOI or the date changes, fetch that day's NDVI.
  useEffect(() => {
    if (!aoiId || !date) return;
    let stale = false; // ignore the answer if the user has already chosen something else
    setLoading(true);
    setError('');
    api('/ndvi/calculate', { method: 'POST', body: { aoiId, date } })
      .then((d) => !stale && setData(d))
      .catch((err) => {
        if (stale) return;
        setData(null);
        setError(err.message);
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [aoiId, date]);

  if (aois === null) return <p className="muted">Loading…</p>;
  if (aois.length === 0) {
    return (
      <>
        <h1>NDVI Map View</h1>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="muted">No field has been assigned to you yet. Please ask your admin to assign one.</p>
      </>
    );
  }

  // Use the AOI the result belongs to, so the outline never mismatches while a new result loads.
  const dataAoi = data && aois.find((a) => a._id === data.result.aoi);
  const value = data && probe ? pixelAt(data.result.bounds, data.pixels, probe.lat, probe.lng) : null;
  const shares = data && shareByClass(data.pixels);

  return (
    <>
      <h1>NDVI Map View</h1>
      <p className="muted">Visualize vegetation health across your field.</p>

      <div className="card controls">
        <div>
          <label htmlFor="aoi">Select AOI</label>
          <select id="aoi" value={aoiId} onChange={(e) => setAoiId(e.target.value)}>
            {aois.map((a) => (
              <option key={a._id} value={a._id}>{a.name} ({a.areaHa} ha)</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date">Select date</label>
          <input id="date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="map-layout">
        <div className="map-wrap">
          {data && dataAoi && <NdviMapView aoi={dataAoi} result={data.result} pixels={data.pixels} onProbe={setProbe} />}
          {loading && <div className="map-loading" role="status">Calculating NDVI…</div>}
        </div>

        <aside className="map-side">
          <div className="card">
            <h2>Current snapshot</h2>
            {data ? (
              <>
                <p className="big">{data.result.avgNdvi.toFixed(2)}</p>
                <p className="muted">Average NDVI on {data.result.date}</p>
                <p>{classify(data.result.avgNdvi)} overall (lowest {data.result.minNdvi.toFixed(2)}, highest {data.result.maxNdvi.toFixed(2)})</p>
                <ul className="shares">
                  {Object.entries(shares).map(([name, pct]) => (
                    <li key={name}>{name}: {pct}% of the field</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted">Choose a field and a date.</p>
            )}
          </div>

          <div className="card">
            <h2>NDVI at pointer</h2>
            {value !== null ? (
              <p><strong>{value.toFixed(3)}</strong> · {classify(value)}</p>
            ) : (
              <p className="muted">Move over the map, or tap it, to see the value of a pixel.</p>
            )}
          </div>

          <div className="card">
            <h2>NDVI legend</h2>
                <NdviLegend />
           </div>
        </aside>
      </div>

      <p className="disclaimer">
        NDVI shows how green the vegetation is. Low values may mean stress, but they do not confirm any disease, pest,
        nutrient deficiency or water shortage.  
      </p>
    </>
  );
}