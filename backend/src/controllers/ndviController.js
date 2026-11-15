import mongoose from 'mongoose';
import Aoi from '../models/Aoi.js';
import NdviResult from '../models/NdviResult.js';
import { generateNdvi } from '../services/mockNdvi.js';
import { savePixels, loadPixels } from '../services/ndviStore.js';

const MAX_SERIES_DAYS = 120;
const todayUtc = () => new Date().toISOString().slice(0, 10);

// True for a real calendar date written as YYYY-MM-DD.
const isDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) 
    return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Every date from `from` to `to`, both included.
function daysBetween(from, to) {
  const days = [];
  for (
    let d = new Date(`${from}T00:00:00Z`);
    d.toISOString().slice(0, 10) <= to;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

//  Admin may use any AOI; a farmer only the AOIs assigned to them. Resolves to null otherwise.
const findAoi = async (user, id) =>
  mongoose.isValidObjectId(id)
    ? Aoi.findOne(user.role === 'admin' ? { _id: id } : { _id: id, assignedUsers: user._id })
    : null;

// the browser gets everything except the internal file path.
const summary = (r) => ({
  id: r._id, 
  aoi: r.aoi, 
  date: r.date, 
  avgNdvi: r.avgNdvi,
  minNdvi: r.minNdvi, 
  maxNdvi: r.maxNdvi,
  rows: r.rows, 
  cols: r.cols, 
  bounds: r.bounds, 
  source: r.source,
});

// The pixel file is only a cache of the mock output, so rebuild it if it went missing.
async function pixelsOf(aoi, result) {
  try {
    return await loadPixels(result.file);
  } catch {
    const { pixels } = generateNdvi(aoi.geometry, aoi.id, result.date);
    await savePixels(result.file, pixels);
    return pixels;
  }
}

// Finds the saved result for an AOI + date, or makes and saves it (mock model).
// Returns { result, pixels } (pixels only when it was just made), or null if the AOI cannot be analysed.
async function ensureResult(aoi, date, userId) {
  const existing = await NdviResult.findOne({ aoi: aoi._id, date });
  if (existing) return { result: existing };

  const grid = generateNdvi(aoi.geometry, aoi.id, date);
  if (!grid) return null;

  const file = `${aoi.id}/${date}.json`;
  await savePixels(file, grid.pixels);

  try {
    const result = await NdviResult.create({
      aoi: aoi._id,
      date,
      avgNdvi: grid.avg,
      minNdvi: grid.min,
      maxNdvi: grid.max,
      rows: grid.rows,
      cols: grid.cols,
      bounds: grid.bounds,
      file,
      requestedBy: userId,
    });
    return { result, pixels: grid.pixels };
  } catch (err) {
    if (err.code !== 11000) throw err; // two identical requests at once: use the one that won
    return { result: await NdviResult.findOne({ aoi: aoi._id, date }) };
  }
}

const TOO_THIN = 'This AOI is too small or too thin to analyse. Redraw it wider.';

// POST /api/ndvi/calculate  body: { aoiId, date: 'YYYY-MM-DD' }
export async function calculate(req, res) {
  const { aoiId, date } = req.body;
  if (!isDate(date)){ 
    return res.status(400).json({ message: 'date must be a real date like 2025-05-18' });
  }
  if (date > new Date().toISOString().slice(0, 10)){
     return res.status(400).json({ message: 'date cannot be in the future' });
  }

  const aoi = await findAoi(req.user, aoiId);
  if (!aoi) 
    return res.status(404).json({ message: 'AOI not found' });

  const made = await ensureResult(aoi, date, req.user._id);
  if (!made) return res.status(422).json({ message: TOO_THIN });

  res.json({
    result: summary(made.result),
    pixels: made.pixels ?? (await pixelsOf(aoi, made.result)),
  });
}

// POST /api/ndvi/series  body: { aoiId, from, to }
// This is what the Dashboard and Trends pages draw their charts from.
// POST /api/ndvi/series  body: { aoiId, from, to }
export async function series(req, res) {
  try {
    const { aoiId, from, to } = req.body;
    
    if (!isDate(from) || !isDate(to) || from > to) {
      return res.status(400).json({ message: 'from and to must be dates like 2025-05-18, with from not after to' });
    }
    if (to > todayUtc()) {
      return res.status(400).json({ message: 'to cannot be in the future' });
    }

    const days = daysBetween(from, to);
    if (days.length > MAX_SERIES_DAYS) {
      return res.status(400).json({ message: `Ask for at most ${MAX_SERIES_DAYS} days at a time` });
    }

    const aoi = await findAoi(req.user, aoiId);
    if (!aoi) return res.status(404).json({ message: 'AOI not found' });

    // SENIOR OPTIMIZATION: Query the database directly for existing snapshots.
    // We removed ensureResult() from this loop so the server no longer generates 
    // 60 days of mock pixel grids, preventing memory crashes and ECONNRESET errors.
    const results = await NdviResult.find({
      aoi: aoi._id,
      date: { $gte: from, $lte: to }
    })
      .sort({ date: 1 })
      .lean();

    res.json({ results: results.map(summary) });
  } catch (error) {
    console.error('Error in /api/ndvi/series:', error);
    res.status(500).json({ message: 'Server error retrieving trend data.' });
  }
}

// GET /api/ndvi/:id  Re-opens a saved result with its pixels.
export async function getResult(req, res) {
  const result = mongoose.isValidObjectId(req.params.id) && (await NdviResult.findById(req.params.id));
  const aoi = result && (await findAoi(req.user, result.aoi));
  if (!aoi){
     return res.status(404).json({ message: 'Result not found' });
  }
  res.json({ 
    result: summary(result), 
    pixels: await pixelsOf(aoi, result) 
  });
}

// GET /api/ndvi?aoiId=...&from=YYYY-MM-DD&to=YYYY-MM-DD  Saved results for the trend charts, oldest first.
export async function history(req, res) {
  const { aoiId, from, to } = req.query;
  const aoi = await findAoi(req.user, aoiId);
  if (!aoi){ 
    return res.status(404).json({ message: 'AOI not found' });
  }
  if ((from && !isDate(from)) || (to && !isDate(to))) {
    return res.status(400).json({ message: 'from and to must be dates like 2025-05-18' });
  }

  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  const filter = { aoi: aoi._id, ...(from || to ? { date: range } : {}) };

  const results = await NdviResult.find(filter).sort({ date: 1 }).limit(400);
  res.json({ 
    results: results.map(summary)
   });
}