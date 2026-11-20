import AlertRule from '../models/AlertRule.js';
import { DEFAULT_RULES, validateRules } from '../services/alertRules.js';

// Helper function to extract only the threshold values from a database document
function formatRuleData(ruleDoc) {
  return {
    ndvi: {
      high: ruleDoc.ndvi.high,
      moderate: ruleDoc.ndvi.moderate,
      low: ruleDoc.ndvi.low
    },
    drop: {
      high: ruleDoc.drop.high,
      moderate: ruleDoc.drop.moderate,
      low: ruleDoc.drop.low
    }
  };
}

// GET /api/admin/alert-rules - Fetches saved rules or falls back to system defaults
export async function getRules(req, res) {
  try {
    const savedRules = await AlertRule.findOne({ key: 'default' });

    if (savedRules) {
      return res.status(200).json({
        rules: formatRuleData(savedRules),
        defaults: DEFAULT_RULES
      });
    }

    return res.status(200).json({
      rules: DEFAULT_RULES,
      defaults: DEFAULT_RULES
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching alert rules: ' + err.message });
  }
}

// PATCH /api/admin/alert-rules - Validates and updates the system alert rules
export async function updateRules(req, res) {
  try {
    const validationResult = validateRules(req.body);

    if (validationResult.error) {
      return res.status(400).json({ message: validationResult.error });
    }

    const updateFields = {
      ndvi: validationResult.rules.ndvi,
      drop: validationResult.rules.drop,
      updatedBy: req.user._id
    };

    // upsert: true creates the document if it doesn't exist yet, 
    const updatedRecord = await AlertRule.findOneAndUpdate(
      { key: 'default' },
      updateFields,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      rules: formatRuleData(updatedRecord)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating alert rules: ' + err.message });
  }
}