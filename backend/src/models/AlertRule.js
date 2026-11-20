import mongoose from 'mongoose';

// Schema for storing system-wide custom alert rules in MongoDB
const alertRuleSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'default',
    unique: true
  },
  ndvi: {
    high: { type: Number, required: true },
    moderate: { type: Number, required: true },
    low: { type: Number, required: true }
  },
  drop: {
    high: { type: Number, required: true },
    moderate: { type: Number, required: true },
    low: { type: Number, required: true }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const AlertRule = mongoose.model('AlertRule', alertRuleSchema);

export default AlertRule;