import mongoose from 'mongoose';

const aoiSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // GeoJSON Polygon: coordinates[0] is one closed ring of [lng, lat] points.
    geometry: {
      type: { type: String, enum: ['Polygon'], required: true },
      coordinates: { type: [[[Number]]], required: true },
    },
    areaHa: { type: Number, required: true },
   // Farmers who can see this AOI in their dropdown.
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Aoi', aoiSchema);