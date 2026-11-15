import { useEffect, useState } from 'react';
import NdviMapView from '../components/NdviMapView';
import TrendChart from '../components/TrendChart';
import { api } from '../services/api';
import { useAois } from '../services/useAois';
import {
  CHANGE_BANDS,
  average,
  changeColor,
  compareGrids,
  downloadCsv,
  periods,
  signed,
  splitSeries,
  toCsv,
  todayUtc,
  zoneAverages,
} from '../utils/trends';

const RANGES = [7, 14, 30]; 

export default function Trends() {
  const { aois, aoiId, setAoiId, error: aoiError } = useAois();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!aoiId) return;

    const per = periods(todayUtc(), days);
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
      api('/ndvi/calculate', {
        method: 'POST',
        body: { aoiId, date: per.previous.to },
      }),
    ])
      .then(([series, latest, earlier]) => {
        if (!stale) {
          setData({
            ...splitSeries(series.results, per),
            latest,
            earlier,
            per,
          });
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
  }, [aoiId, days]);

  if (aois === null) return <p className="muted">Loading…</p>;

  if (aois.length === 0) {
    return (
      <>
        <h1>Trends</h1>
        {aoiError && <p className="error" role="alert">{aoiError}</p>}
        <p className="muted">
          No field has been assigned to you yet. Please ask your admin to assign one.
        </p>
      </>
    );
  }

  // Determine if valid data exists
  const hasData = data && data.current && data.current.length > 0 && data.latest?.result && data.earlier?.result;
  
  const aoi = data ? aois.find((a) => a._id === data.latest?.result?.aoi) : null;

  let stats = null;
  if (hasData) {
    const avg = average(data.current) ?? 0;
    const prevAvg = average(data.previous) ?? 0;
    stats = {
      avg,
      change: avg - prevAvg,
      pct: prevAvg !== 0 ? ((avg - prevAvg) / prevAvg) * 100 : 0,
      cmp: compareGrids(data.latest.pixels, data.earlier.pixels),
      zonesNow: zoneAverages(data.latest.pixels),
      zonesBefore: zoneAverages(data.earlier.pixels),
    };
  }

  const exportCsv = () => {
    if (!hasData) return;
    downloadCsv(
      `ndvi-${aoi.name.replace(/\W+/g, '-')}-${data.per.current.from}-to-${data.per.current.to}.csv`,
      toCsv(data.current)
    );
  };

  // Render empty state if no backend data exists yet
  if (data && !hasData) {
    return (
      <>
        <h1>Trends</h1>
        <p className="muted">Track vegetation health changes over time.</p>
        <div className="card controls">
          {aois.length > 1 && (
            <div>
              <label htmlFor="aoi">Field</label>
              <select id="aoi" value={aoiId} onChange={(e) => setAoiId(e.target.value)}>
                {aois.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="range">Date range</label>
            <select id="range" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {RANGES.map((n) => (
                <option key={n} value={n}>Last {n} days</option>
              ))}
            </select>
          </div>
          <button className="btn-small" onClick={exportCsv} disabled={true}>
            Export CSV
          </button>
        </div>

        <div className="card">
          <h2>No Trend Data Available</h2>
          <p className="muted">
            There are no historical NDVI snapshots recorded for this field in the selected window. 
            Once satellite imagery is ingested, trends will populate here.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Trends</h1>
      <p className="muted">Track vegetation health changes over time.</p>

      <div className="card controls">
        {aois.length > 1 && (
          <div>
            <label htmlFor="aoi">Field</label>
            <select id="aoi" value={aoiId} onChange={(e) => setAoiId(e.target.value)}>
              {aois.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="range">Date range</label>
          <select id="range" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {RANGES.map((n) => (
              <option key={n} value={n}>Last {n} days</option>
            ))}
          </select>
        </div>
        <button className="btn-small" onClick={exportCsv} disabled={!hasData}>
          Export CSV
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p className="muted" role="status">Loading trends…</p>}

      {hasData && (
        <>
          <div className="stat-grid">
            <div className="card">
              <h2>Average NDVI</h2>
              <p className="big">{stats.avg.toFixed(2)}</p>
              <p className="muted">{signed(stats.pct, 1)}% vs previous {days} days</p>
            </div>
            <div className="card">
              <h2>NDVI change</h2>
              <p className="big">{signed(stats.change)}</p>
              <p className="muted">vs previous {days} days</p>
            </div>
            <div className="card">
              <h2>Health improvement</h2>
              <p className="big good">{stats.cmp.improved}%</p>
              <p className="muted">of the field improved since {data.per.previous.to}</p>
            </div>
            <div className="card">
              <h2>Health decline</h2>
              <p className="big bad">{stats.cmp.declined}%</p>
              <p className="muted">of the field declined since {data.per.previous.to}</p>
            </div>
          </div>

          <div className="card">
            <h2>NDVI trend over time</h2>
            <p className="muted">Solid line: {data.per.current.from} to {data.per.current.to}. Dashed line: the {days} days before.</p>
            <TrendChart current={data.current} previous={data.previous} />
          </div>

          <div className="trend-row">
            <div className="card">
              <h2>NDVI Difference map</h2>
              <p className="muted">{data.per.current.to} compared with {data.per.previous.to}</p>
              <NdviMapView aoi={aoi} result={data.latest.result} pixels={stats.cmp.grid} colorOf={changeColor} small />
              <ul className="band-list">
                {CHANGE_BANDS.map((b) => (
                  <li key={b.name}>
                    <span className="swatch" style={{ background: `rgb(${b.color.join(',')})` }} /> {b.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>NDVI by zone</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Zone</th>
                      <th>{data.per.previous.to}</th>
                      <th>{data.per.current.to}</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(stats.zonesNow).map((zone) => {
                      const before = stats.zonesBefore[zone];
                      const now = stats.zonesNow[zone];
                      return (
                        <tr key={zone}>
                          <td>{zone}</td>
                          <td>{before === null || before === undefined ? '–' : before.toFixed(2)}</td>
                          <td>{now === null || now === undefined ? '–' : now.toFixed(2)}</td>
                          <td>{before === null || now === null || before === undefined || now === undefined ? '–' : signed(now - before)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="muted">Zones are the northern, southern, eastern and western halves of your field.</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}