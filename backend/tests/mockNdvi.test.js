import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateNdvi } from '../src/services/mockNdvi.js';

const square = (size = 0.01) => ({
  type: 'Polygon',
  coordinates: [[[74.3, 31.5], [74.3 + size, 31.5], [74.3 + size, 31.5 + size], [74.3, 31.5 + size], [74.3, 31.5]]],
});
// Right-angle triangle: the north-east corner of its bounding box is outside the shape.
const triangle = { type: 'Polygon', coordinates: [[[74.3, 31.5], [74.31, 31.5], [74.3, 31.51], [74.3, 31.5]]] };

describe('generateNdvi (mock model)', () => {
  it('gives the same result for the same AOI and date', () => {
    assert.deepEqual(generateNdvi(square(), 'aoi1', '2025-05-18'), generateNdvi(square(), 'aoi1', '2025-05-18'));
  });

  it('gives different results for different dates and different AOIs', () => {
    const base = generateNdvi(square(), 'aoi1', '2025-05-18').avg;
    assert.notEqual(generateNdvi(square(), 'aoi1', '2025-05-19').avg, base);
    assert.notEqual(generateNdvi(square(), 'aoi2', '2025-05-18').avg, base);
  });

  it('keeps every value inside the valid NDVI range, with min <= avg <= max', () => {
    for (const date of ['2025-01-05', '2025-05-18', '2025-09-30', '2025-12-31']) {
      const g = generateNdvi(square(), 'aoi1', date);
      const values = g.pixels.flat().filter((v) => v !== null);
      assert.ok(values.every((v) => v >= -1 && v <= 1));
      assert.ok(g.min <= g.avg && g.avg <= g.max);
    }
  });

  it('returns a rows x cols grid with null outside the polygon', () => {
    const g = generateNdvi(triangle, 'aoi1', '2025-05-18');
    assert.equal(g.pixels.length, g.rows);
    assert.ok(g.pixels.every((row) => row.length === g.cols));
    assert.equal(g.pixels[0][g.cols - 1], null); // north-east corner is outside the triangle
    assert.notEqual(g.pixels[g.rows - 1][0], null); // south-west corner is inside
  });

  it('caps a large AOI at 120 pixels along its longer side', () => {
    const g = generateNdvi(square(0.2), 'aoi1', '2025-05-18');
    assert.ok(Math.max(g.rows, g.cols) <= 120);
  });

  it('reports the bounding box of the AOI', () => {
    const { bounds } = generateNdvi(square(), 'aoi1', '2025-05-18');
    assert.deepEqual(bounds, { south: 31.5, west: 74.3, north: 31.51, east: 74.31 });
  });
});