import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NdviLegend from '../components/NdviLegend';
import NdviMapView from '../components/NdviMapView';
import TrendChart from '../components/TrendChart';
import { api } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useAois } from '../services/useAois';
import { classify } from '../utils/ndvi';
import { average, periods, signed, splitSeries, todayUtc } from '../utils/trends';

const DAYS = 30;

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

const MESSAGE = {
  Healthy: 'Your crops look good! Vegetation is dense and actively growing.',
  Moderate: 'Vegetation is moderate. Check the map for areas with lower values.',
  'Low (Stress)': 'Vegetation is low. Please check the map and verify conditions in the field.',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { aois, aoiId, setAoiId, error: aoiError } = useAois();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!aoiId) return;

    const per = periods(todayUtc(), DAYS);
    let stale = false;

    setData(null);
    setError('');

    Promise.all([
      api('/ndvi/series', {
        method: 'POST',
        body: { aoiId, from: per.previous.from, to: per.current.to },
      }),
      api('/ndvi/calculate', {
        method: 'POST',
        body: { aoiId, date: per.current.to },
      }),
    ])
      .then(([series, latest]) => {
        if (!stale) {
          setData({ ...splitSeries(series.results, per), latest });
        }
      })
      .catch((err) => {
        if (!stale) {
          setError(err.message);
        }
      });

    return () => {
      stale = true;
    };
  }, [aoiId]);

  if (aois === null) return <p className="muted">Loading…</p>;

  const heading = (
    <>
      <h1>
        {greeting()}, {user.name}!
      </h1>
    </>
  );

  if (aois.length === 0) {
    return (
      <>
        {heading}
        {aoiError && (
          <p className="error" role="alert">
            {aoiError}
          </p>
        )}
        <p className="muted">
          No field has been assigned to you yet. Please ask your admin to assign one.
        </p>
      </>
    );
  }

  const hasData = data && data.current && data.current.length > 0 && data.latest?.result;

  // Render empty state if no backend data exists yet
  if (data && !hasData) {
    return (
      <>
      {/* Header with Greeting on Left and Field Selector on Top Right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
        {heading}
        {aois.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', padding: '0.35rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <label htmlFor="aoi" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Field:</label>
            <select id="aoi" value={aoiId} onChange={(e) => setAoiId(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
              {aois.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
        
        <div className="card">
          <h2>No Field Data Available</h2>
          <p className="muted">
            There are no NDVI snapshots recorded for your assigned fields yet. 
            Check back later once the satellite imagery pipeline is active.
          </p>
        </div>
      </>
    );
  }

  // Crash-proof variables using safe fallbacks (?? 0)
  const aoi = data ? aois.find((a) => a._id === data.latest?.result?.aoi) : null;
  const latestAvg = data?.latest?.result?.avgNdvi ?? 0;
  const band = data ? classify(latestAvg) : 'Healthy';
  
  const currentAvg = data ? (average(data.current) ?? 0) : 0;
  const previousAvg = data ? (average(data.previous) ?? 0) : 0;
  const change = currentAvg - previousAvg;

  return (
    <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        {heading}
        {aois.length > 1 && (
          <div className="controls" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div>
              <label htmlFor="aoi" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)' }}>Field</label>
              <select id="aoi" value={aoiId} onChange={(e) => setAoiId(e.target.value)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', background: '#fff' }}>
                {aois.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p className="muted" role="status">Loading your field…</p>}

      {data && (
        <div className="dash-grid" style={{ gap: '0.55rem', marginBottom: '0.25rem' }}>
          <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
            <h2 style={{ marginBottom: '0.3rem' }}>Current NDVI status</h2>
            <p className="big" style={{ fontSize: '1.8rem' }}>{band}</p>
            <p style={{ margin: '0.2rem 0', fontSize: '0.85rem' }}>{MESSAGE[band]}</p>
            <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>Average NDVI today: {latestAvg.toFixed(2)}</p>
          </div>

          <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
            <h2 style={{ marginBottom: '0.3rem' }}>NDVI trend (last {DAYS} days)</h2>
            <p className="big" style={{ fontSize: '1.8rem' }}>{currentAvg.toFixed(2)}</p>
            <p className="muted" style={{ margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}>
              {signed(change)} vs previous {DAYS} days
            </p>
            <div style={{ maxHeight: '75px', overflow: 'hidden' }}>
              <TrendChart current={data.current} compact />
            </div>
          </div>

          <div className="card dash-map" style={{ padding: '0.85rem', marginBottom: 0 }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Your assigned field (AOI)</h2>
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
              <NdviMapView aoi={aoi} result={data.latest.result} pixels={data.latest.pixels} small />
              <Link 
                to="/ndvi-map" 
                className="btn" 
                style={{ 
                  position: 'absolute', bottom: '10px', left: '10px', zIndex: 1000, 
                  padding: '0.35rem 0.8rem', fontSize: '0.8rem', width: 'auto', margin: 0,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
              >
                Open detailed map →
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem', marginBottom: 0 }}>
            <h2 style={{ marginBottom: '0.5rem' }}>NDVI Interpretation Guide</h2>
            <NdviLegend />
          </div>
        </div>
      )}

    </>
  );
}