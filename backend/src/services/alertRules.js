// Default threshold rules set by the admin for agricultural crop stress alerts
export const DEFAULT_RULES = {
  ndvi: { high: 0.33, moderate: 0.45, low: 0.6 },
  drop: { high: 0.15, moderate: 0.1, low: 0.05 },
};

const LEVELS = ['high', 'moderate', 'low'];

// Helper to ensure an input is a valid, non-NaN numeric value before processing
function checkIsNumber(val) {
  return typeof val === 'number' && !Number.isNaN(val);
}

// Utility to round calculated thresholds to 2 clean decimal places for UI consistency
function roundTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}

// Validates admin-configured custom alert parameters and enforces logical boundary rules
export function validateRules(input) {

  // Ensure the outer rule categories exist before iterating through levels
  if (!input || typeof input !== 'object') {
    return { error: 'ndvi.high must be a number' };
  }
  if (!input.ndvi) {
    return { error: 'ndvi.high must be a number' };
  }
  if (!input.drop) {
    return { error: 'drop.high must be a number' };
  }

  const ndviInput = input.ndvi;
  const dropInput = input.drop;

  // Verify that every severity level contains a valid numerical threshold
  for (const levelName of LEVELS) {
    if (!checkIsNumber(ndviInput[levelName])) {
      return { error: 'ndvi.' + levelName + ' must be a number' };
    }
    if (!checkIsNumber(dropInput[levelName])) {
      return { error: 'drop.' + levelName + ' must be a number' };
    }
  }

  const n = input.ndvi;
  const d = input.drop;

  // Validate absolute NDVI progression: severe stress thresholds must be lower than mild ones (0 < high < moderate < low <= 1)
  if (!(n.high > 0 && n.high < n.moderate && n.moderate < n.low && n.low <= 1)) {
    return { error: 'NDVI levels must satisfy 0 < high < moderate < low <= 1' };
  }

  // Validate vegetation drop progression: larger negative percentage deltas represent higher severity levels
  if (!(d.low > 0 && d.low < d.moderate && d.moderate < d.high && d.high <= 1)) {
    return { error: 'Drop levels must satisfy 0 < low < moderate < high <= 1' };
  }

  // Build the clean, rounded rules object to persist in the database
  const validatedRules = {
    ndvi: {},
    drop: {}
  };

  for (const levelName of LEVELS) {
    validatedRules.ndvi[levelName] = roundTwoDecimals(n[levelName]);
    validatedRules.drop[levelName] = roundTwoDecimals(d[levelName]);
  }

  return { rules: validatedRules };
}

// Evaluates a specific field reading against active alert rules and historical baseline data
export function severityFor(rules, data) {
  const ndvi = data.ndvi;
  let previousAvg = data.previousAvg;

  // Fallback to zero change if historical 7-day baseline data is missing
  if (previousAvg === null || previousAvg === undefined) {
    previousAvg = 0;
  }

  // Calculate vegetation decline relative to the previous baseline, rounding to 3 decimals to avoid floating-point errors
  let dropVal = previousAvg - ndvi;
  if (dropVal < 0) {
    dropVal = 0;
  }
  const drop = Math.round(dropVal * 1000) / 1000;

  let ndviLevel = null;
  let dropLevel = null;

  // Check if current absolute NDVI falls below any configured threshold
  for (const level of LEVELS) {
    if (ndvi < rules.ndvi[level]) {
      ndviLevel = level;
      break;
    }
  }

  // Check if the vegetation drop exceeds any configured percentage delta threshold
  for (const level of LEVELS) {
    if (drop >= rules.drop[level]) {
      dropLevel = level;
      break;
    }
  }

  // Aggregate all triggered alert criteria for this evaluation cycle
  const triggeredAlerts = [];
  if (ndviLevel !== null) {
    triggeredAlerts.push(ndviLevel);
  }
  if (dropLevel !== null) {
    triggeredAlerts.push(dropLevel);
  }

  // Return null if all metrics are within normal, healthy parameters
  if (triggeredAlerts.length === 0) {
    return null;
  }

  // If both absolute stress and rapid drop occur simultaneously, return the higher (more critical) severity level
  if (triggeredAlerts.length === 2) {
    const index1 = LEVELS.indexOf(triggeredAlerts[0]);
    const index2 = LEVELS.indexOf(triggeredAlerts[1]);
    if (index1 < index2) {
      return triggeredAlerts[0];
    }
    return triggeredAlerts[1];
  }

  return triggeredAlerts[0];
}