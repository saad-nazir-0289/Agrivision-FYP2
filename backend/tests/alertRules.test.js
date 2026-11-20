import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RULES, validateRules, severityFor } from '../src/services/alertRules.js';

// Helper function to build custom rule objects for testing boundaries
function createTestRules(customNdvi, customDrop) {
  return {
    ndvi: { 
      high: 0.33, 
      moderate: 0.45, 
      low: 0.6, 
      ...customNdvi 
    },
    drop: { 
      high: 0.15, 
      moderate: 0.1, 
      low: 0.05, 
      ...customDrop 
    }
  };
}

describe('validateRules function tests', () => {
  
  it('should accept default rules and return them without changes', () => {
    const result = validateRules(DEFAULT_RULES);
    assert.deepEqual(result, { rules: DEFAULT_RULES });
  });

  it('should round numbers to 2 decimal places correctly', () => {
    const customInput = createTestRules({ high: 0.3333 }, { low: 0.0449 });
    const validation = validateRules(customInput);
    
    assert.equal(validation.rules.ndvi.high, 0.33);
    assert.equal(validation.rules.drop.low, 0.04);
  });

  it('should reject missing properties, missing levels, and non-numeric values', () => {
    // Test empty input structure
    const emptyTest = validateRules({});
    assert.match(emptyTest.error, /ndvi.high must be a number/);

    // Test missing drop object
    const missingDrop = validateRules({ ndvi: DEFAULT_RULES.ndvi });
    assert.match(missingDrop.error, /drop.high must be a number/);

    // Test string instead of number
    const stringTest = validateRules(createTestRules({ high: '0.3' }));
    assert.match(stringTest.error, /ndvi.high must be a number/);

    // Test NaN value
    const nanTest = validateRules(createTestRules({}, { low: NaN }));
    assert.match(nanTest.error, /drop.low must be a number/);

    // Test null input
    const nullTest = validateRules(null);
    assert.match(nullTest.error, /must be a number/);
  });

  it('should require NDVI thresholds to increase from high to moderate to low, between 0 and 1', () => {
    const invalidCases = [
      { high: 0.5 }, 
      { moderate: 0.3 }, 
      { low: 0.4 }, 
      { high: 0 }, 
      { low: 1.2 }
    ];

    for (let i = 0; i < invalidCases.length; i++) {
      const badRules = createTestRules(invalidCases[i]);
      const result = validateRules(badRules);
      assert.match(result.error, /NDVI levels/);
    }

    // Edge case: low can be exactly 1
    const validBoundary = validateRules(createTestRules({ low: 1 }));
    assert.ok(validBoundary.rules);
  });

  it('should require drop thresholds to increase from low to moderate to high, between 0 and 1', () => {
    const invalidDropCases = [
      { low: 0.12 }, 
      { moderate: 0.2 }, 
      { high: 0.08 }, 
      { low: 0 }, 
      { high: 1.5 }
    ];

    for (let i = 0; i < invalidDropCases.length; i++) {
      const badRules = createTestRules({}, invalidDropCases[i]);
      const result = validateRules(badRules);
      assert.match(result.error, /Drop levels/);
    }
  });

});

describe('severityFor function tests', () => {

  it('should correctly evaluate standard alert test cases', () => {
    const testCases = [
      { reading: { ndvi: 0.28, previousAvg: 0.5 }, expected: 'high' },
      { reading: { ndvi: 0.31, previousAvg: 0.49 }, expected: 'high' },
      { reading: { ndvi: 0.44, previousAvg: 0.55 }, expected: 'moderate' },
      { reading: { ndvi: 0.42, previousAvg: 0.52 }, expected: 'moderate' },
      { reading: { ndvi: 0.58, previousAvg: 0.64 }, expected: 'low' },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const actualSeverity = severityFor(DEFAULT_RULES, testCase.reading);
      assert.equal(actualSeverity, testCase.expected);
    }
  });

  it('should return null for healthy and steady crop readings', () => {
    const severity = severityFor(DEFAULT_RULES, { ndvi: 0.7, previousAvg: 0.71 });
    assert.equal(severity, null);
  });

  it('should trigger an alert on a sharp vegetation drop even if current NDVI looks normal', () => {
    const severity = severityFor(DEFAULT_RULES, { ndvi: 0.7, previousAvg: 0.9 });
    assert.equal(severity, 'high');
  });

  it('should rely solely on absolute NDVI when historical baseline data is missing', () => {
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.3 }), 'high');
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.3, previousAvg: null }), 'high');
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.9 }), null);
  });

  it('should ignore positive vegetation growth (negative drops)', () => {
    const severity = severityFor(DEFAULT_RULES, { ndvi: 0.8, previousAvg: 0.3 });
    assert.equal(severity, null);
  });

  it('should handle exact threshold boundaries properly without floating-point errors', () => {
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.6 }), null);
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.59 }), 'low');
    
    // Drop of exactly 0.15 (0.9 - 0.75)
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.75, previousAvg: 0.9 }), 'high'); 
    
    // Floating point correction check (0.7 - 0.55 can evaluate weirdly in JS without rounding)
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.55, previousAvg: 0.7 }), 'high');  
  });

  it('should respect custom rules defined by the admin', () => {
    const customValidation = validateRules(createTestRules({ high: 0.5, moderate: 0.6, low: 0.7 }));
    const strictRules = customValidation.rules;

    assert.equal(severityFor(strictRules, { ndvi: 0.45 }), 'high');
    assert.equal(severityFor(DEFAULT_RULES, { ndvi: 0.45 }), 'low');
  });

});