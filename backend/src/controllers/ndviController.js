import mongoose from 'mongoose';
import Aoi from '../models/Aoi.js';
import NdviResult from '../models/NdviResult.js';
import { generateNdvi } from '../services/mockNdvi.js';
import { savePixels, loadPixels } from '../services/ndviStore.js';

// True for a real calendar date written as YYYY-MM-DD.
const isDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// An admin may use any AOI; a farmer only the AOIs assigned to them. Resolves to null otherwise.
const findAoi = async (user, id) =>
  mongoose.isValidObjectId(id)
    ? Aoi.findOne(user.role === 'admin' ? { _id: id } : { _id: id, assignedUsers: user._id })
    : null;

// the browser gets everything except the internal file path.
const summary = (r) => ({
  id: r._id, aoi: r.aoi, date: r.date, avgNdvi: r.avgNdvi, minNdvi: r.minNdvi, maxNdvi: r.maxNdvi,
  rows: r.rows, cols: r.cols, bounds: r.bounds, source: r.source,
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

// POST /api/ndvi/calculate  body: { aoiId, date: 'YYYY-MM-DD' }
export async function calculate(req, res) {
  const { aoiId, date } = req.body;
  if (!isDate(date)) return res.status(400).json({ message: 'date must be a real date like 2025-05-18' });
  if (date > new Date().toISOString().slice(0, 10)) return res.status(400).json({ message: 'date cannot be in the future' });

  const aoi = await findAoi(req.user, aoiId);
  if (!aoi) return res.status(404).json({ message: 'AOI not found' });

  let result = await NdviResult.findOne({ aoi: aoi._id, date });
  if (result) return res.json({ result: summary(result), pixels: await pixelsOf(aoi, result) });

  const grid = generateNdvi(aoi.geometry, aoi.id, date);
  if (!grid) return res.status(422).json({ message: 'This AOI is too small or too thin to analyse. Redraw it wider.' });

  const file = `${aoi.id}/${date}.json`;
  await savePixels(file, grid.pixels);
  try {
    result = await NdviResult.create({
      aoi: aoi._id, date, avgNdvi: grid.avg, minNdvi: grid.min, maxNdvi: grid.max,
      rows: grid.rows, cols: grid.cols, bounds: grid.bounds, file, requestedBy: req.user._id,
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // two identical requests at once: use the one that won
    result = await NdviResult.findOne({ aoi: aoi._id, date });
  }
  res.json({ result: summary(result), pixels: grid.pixels });
}

// GET /api/ndvi/:id  Re-opens a saved result with its pixels.
export async function getResult(req, res) {
  const result = mongoose.isValidObjectId(req.params.id) && (await NdviResult.findById(req.params.id));
  const aoi = result && (await findAoi(req.user, result.aoi));
  if (!aoi) return res.status(404).json({ message: 'Result not found' });
  res.json({ result: summary(result), pixels: await pixelsOf(aoi, result) });
}

// GET /api/ndvi?aoiId=...&from=YYYY-MM-DD&to=YYYY-MM-DD  Saved results for the trend charts, oldest first.
export async function history(req, res) {
  const { aoiId, from, to } = req.query;
  const aoi = await findAoi(req.user, aoiId);
  if (!aoi) return res.status(404).json({ message: 'AOI not found' });
  if ((from && !isDate(from)) || (to && !isDate(to))) {
    return res.status(400).json({ message: 'from and to must be dates like 2025-05-18' });
  }

  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  const filter = { aoi: aoi._id, ...(from || to ? { date: range } : {}) };

  const results = await NdviResult.find(filter).sort({ date: 1 }).limit(400);
  res.json({ results: results.map(summary) });
}