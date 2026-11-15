const fmt = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

// A line chart of daily average NDVI, drawn as SVG. `previous` is drawn as a dashed line for comparison.
// `compact` is the small version without axes, used on the dashboard.
export default function TrendChart({ current, previous = [], compact = false }) {
  if (current.length === 0) {
    return <p className="muted">No data for this period.</p>;
  }

  const W = compact ? 220 : 640;
  const H = compact ? 70 : 240;
  const pad = compact
    ? { l: 4, r: 4, t: 6, b: 6 }
    : { l: 38, r: 50, t: 14, b: 28 };

  const x = (i, n) => pad.l + (n > 1 ? (i / (n - 1)) * (W - pad.l - pad.r) : 0);
  const y = (v) => pad.t + (1 - v) * (H - pad.t - pad.b); // NDVI is always drawn on a 0 to 1 scale

  const line = (list) =>
    list
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${x(i, list.length).toFixed(1)} ${y(p.avgNdvi).toFixed(1)}`
      )
      .join(' ');

  const last = current[current.length - 1];
  const lastX = x(current.length - 1, current.length);
  const labelAt = [0, Math.floor((current.length - 1) / 2), current.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={compact ? 'chart chart-compact' : 'chart'}
      role="img"
      aria-label={`NDVI from ${current[0].date} to ${last.date}, latest ${last.avgNdvi.toFixed(2)}`}
    >
      {!compact &&
        [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              className="grid"
            />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

      {previous.length > 0 && <path d={line(previous)} className="line-prev" />}
      <path d={line(current)} className="line" />
      <circle
        cx={lastX}
        cy={y(last.avgNdvi)}
        r={compact ? 3 : 4}
        className="dot"
      />

      {!compact && (
        <>
          <text
            x={lastX + 8}
            y={y(last.avgNdvi) + 4}
            className="axis strong"
          >
            {last.avgNdvi.toFixed(2)}
          </text>

          {labelAt.map((i, k) => (
            <text
              key={k}
              x={x(i, current.length)}
              y={H - 8}
              textAnchor={['start', 'middle', 'end'][k]}
              className="axis"
            >
              {fmt(current[i].date)}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}