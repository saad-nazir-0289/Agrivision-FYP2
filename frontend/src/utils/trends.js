// "Today" the way the server counts it (UTC), so we never ask for a date the server calls "the future".
export const todayUtc = () => new Date().toISOString().slice(0, 10);

export function shiftDate(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The last `days` days ending today, and the same number of days before that.
export function periods(today, days) {
  return {
    current: { from: shiftDate(today, -(days - 1)), to: today },
    previous: { from: shiftDate(today, -(2 * days - 1)), to: shiftDate(today, -days) },
  };
}

// Splits one list of daily results (oldest first) into the two periods.
export function splitSeries(results, per) {
  return {
    current: results.filter((r) => r.date >= per.current.from),
    previous: results.filter((r) => r.date < per.current.from),
  };
}

export const average = (list) =>
  list.length ? list.reduce((sum, p) => sum + p.avgNdvi, 0) / list.length : null;

// 0.08 -> "+0.08", -0.05 -> "-0.05"
export const signed = (n, digits = 2) => (n > 0 ? '+' : '') + n.toFixed(digits);

// The bands of the "NDVI Change Map" legend. The first band whose test passes wins.
export const CHANGE_BANDS = [
  { name: 'Large increase (above +0.15)', color: [26, 152, 80], test: (d) => d > 0.15 },
  { name: 'Moderate increase (+0.05 to +0.15)', color: [166, 217, 106], test: (d) => d > 0.05 },
  { name: 'No change (-0.05 to +0.05)', color: [235, 235, 235], test: (d) => d >= -0.05 },
  { name: 'Moderate decrease (-0.15 to -0.05)', color: [253, 174, 97], test: (d) => d >= -0.15 },
  { name: 'Large decrease (below -0.15)', color: [215, 48, 39], test: () => true },
];

export const changeColor = (delta) => CHANGE_BANDS.find((b) => b.test(delta)).color;

// Pixel by pixel difference (latest minus earlier), plus the share of the field that improved or declined.
export function compareGrids(latest, earlier) {
  let improved = 0;
  let declined = 0;
  let total = 0;

  const grid = latest.map((row, r) =>
    row.map((v, c) => {
      const before = earlier[r]?.[c];
      if (v === null || before === null || before === undefined) return null;

      const delta = Math.round((v - before) * 1000) / 1000;
      total++;

      if (delta > 0.05) improved++;
      if (delta < -0.05) declined++;

      return delta;
    })
  );

  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return { grid, improved: pct(improved), declined: pct(declined) };
}

// Average NDVI of the northern, southern, eastern and western halves of the field, and of all of it.
export function zoneAverages(pixels) {
  const rows = pixels.length;
  const cols = pixels[0].length;

  const mean = (keep) => {
    let sum = 0;
    let n = 0;

    pixels.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v !== null && keep(r, c)) {
          sum += v;
          n++;
        }
      })
    );

    return n ? Math.round((sum / n) * 100) / 100 : null;
  };

  return {
    'North Zone': mean((r) => r < rows / 2),
    'South Zone': mean((r) => r >= rows / 2),
    'East Zone': mean((r, c) => c >= cols / 2),
    'West Zone': mean((r, c) => c < cols / 2),
    'Overall Field': mean(() => true),
  };
}

export const toCsv = (list) =>
  ['date,average_ndvi', ...list.map((p) => `${p.date},${p.avgNdvi}`)].join('\n');

export function downloadCsv(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}