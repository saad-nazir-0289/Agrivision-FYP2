import mongoose from 'mongoose';

// One row per AOI + date. The heavy pixel grid lives in a file, not in MongoDB.
const ndviResultSchema = new mongoose.Schema(
  {
    aoi: { type: mongoose.Schema.Types.ObjectId, ref: 'Aoi', required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    avgNdvi: { type: Number, required: true },
    minNdvi: { type: Number, required: true },
    maxNdvi: { type: Number, required: true },
    rows: { type: Number, required: true },
    cols: { type: Number, required: true },
    bounds: { south: Number, west: Number, north: Number, east: Number },
    source: { type: String, default: 'mock' }, // becomes 'model' when the real model is connected
    file: { type: String, required: true }, // pixel file inside backend/storage/ndvi, never sent to the browser
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ndviResultSchema.index({ aoi: 1, date: 1 }, { unique: true }); // never two results for the same AOI and day

export default mongoose.model('NdviResult', ndviResultSchema);