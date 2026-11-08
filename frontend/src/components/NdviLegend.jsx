import { legendGradient, legendPos } from '../utils/ndvi';

const TICKS = [-1, 0, 0.33, 0.66, 1];

// The bar covers the full NDVI range, -1 to +1; ticks sit at their true positions on it.
export default function NdviLegend() {
  return (
    <>
      <div className="legend-bar" style={{ background: legendGradient }} />
      <div className="legend-ticks">
        {TICKS.map((v) => (
          <span key={v} style={{ left: `${legendPos(v)}%` }}>
            {v === 0.33 || v === 0.66 ? v.toFixed(2) : v.toFixed(1)}
          </span>
        ))}
      </div>
      <div className="legend-labels">
        <span>No vegetation</span>
        <span>Low (Stress)</span>
        <span>Moderate</span>
        <span>Healthy</span>
      </div>
    </>
  );
}