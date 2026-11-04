import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePolygon } from '../src/utils/geo.js';

// A square of `size` degrees whose south-west corner is (lng, lat).
const square = (lng, lat, size = 0.01) => ({
  type: 'Polygon',
  coordinates: [[[lng, lat], [lng + size, lat], [lng + size, lat + size], [lng, lat + size], [lng, lat]]],
});

describe('validatePolygon', () => {
  it('accepts a polygon in Pakistan and calculates its area', () => {
    const { areaHa, error } = validatePolygon(square(74.3, 31.5));
    assert.equal(error, undefined);
    assert.ok(areaHa > 104 && areaHa < 108, `unexpected area ${areaHa}`); // about 105.7 ha
  });

  it('rejects a polygon outside Pakistan', () => {
    assert.match(validatePolygon(square(10, 10)).error, /inside Pakistan/);
  });

  it('rejects an open ring', () => {
    const open = { type: 'Polygon', coordinates: [square(74.3, 31.5).coordinates[0].slice(0, 4)] };
    assert.match(validatePolygon(open).error, /closed/);
  });

  it('rejects fewer than 3 points', () => {
    const two = { type: 'Polygon', coordinates: [[[74.3, 31.5], [74.31, 31.5], [74.3, 31.5]]] };
    assert.match(validatePolygon(two).error, /at least 3/);
  });

  it('rejects non-numeric coordinates', () => {
    const bad = { type: 'Polygon', coordinates: [[['a', 'b'], [1, 2], [3, 4], ['a', 'b']]] };
    assert.match(validatePolygon(bad).error, /numbers/);
  });

  it('rejects points in a straight line', () => {
    const line = { type: 'Polygon', coordinates: [[[74.3, 31.5], [74.31, 31.5], [74.32, 31.5], [74.3, 31.5]]] };
    assert.match(validatePolygon(line).error, /too small/);
  });

  it('rejects missing or wrong geometry', () => {
    assert.ok(validatePolygon(undefined).error);
    assert.ok(validatePolygon({ type: 'Point', coordinates: [74, 31] }).error);
  });
});
