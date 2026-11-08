import { describe, it, expect } from 'vitest';
import { STOPS, legendGradient, ndviColor, classify, shareByClass, pixelAt } from './ndvi';

describe('ndviColor', () => {
  it('uses the end colours for 0 and 1', () => {
    expect(ndviColor(0)).toEqual(STOPS[0][1]);
    expect(ndviColor(1)).toEqual(STOPS[4][1]);
  });

  it('clamps values outside 0 to 1', () => {
    expect(ndviColor(-0.5)).toEqual(ndviColor(0));
    expect(ndviColor(1.7)).toEqual(ndviColor(1));
  });

  it('hits a stop colour exactly and blends halfway between two stops', () => {
    expect(ndviColor(0.33)).toEqual([253, 174, 97]);
    expect(ndviColor(0.165)).toEqual([234, 111, 68]); // halfway between red and orange
  });
});

describe('classify', () => {
  it('splits at 0.33 and 0.66', () => {
    expect(classify(0.2)).toBe('Low (Stress)');
    expect(classify(0.33)).toBe('Moderate');
    expect(classify(0.65)).toBe('Moderate');
    expect(classify(0.66)).toBe('Healthy');
    expect(classify(0.9)).toBe('Healthy');
  });
});

describe('shareByClass', () => {
  it('counts only pixels inside the AOI', () => {
    const grid = [[0.1, 0.5, null], [0.8, 0.9, null]];
    expect(shareByClass(grid)).toEqual({ 'Low (Stress)': 25, Moderate: 25, Healthy: 50 });
  });

  it('returns zeros for an empty grid', () => {
    expect(shareByClass([[null]])).toEqual({ 'Low (Stress)': 0, Moderate: 0, Healthy: 0 });
  });
});

describe('pixelAt', () => {
  const bounds = { south: 31.5, west: 74.3, north: 31.51, east: 74.31 };
  const grid = [[0.2, 0.5], [0.7, null]]; // row 0 is the north edge

  it('finds the pixel under a position', () => {
    expect(pixelAt(bounds, grid, 31.5075, 74.3025)).toBe(0.2); // north-west
    expect(pixelAt(bounds, grid, 31.5075, 74.3075)).toBe(0.5); // north-east
    expect(pixelAt(bounds, grid, 31.5025, 74.3025)).toBe(0.7); // south-west
  });

  it('returns null for an empty cell and for positions outside the image', () => {
    expect(pixelAt(bounds, grid, 31.5025, 74.3075)).toBeNull();
    expect(pixelAt(bounds, grid, 40, 74.3)).toBeNull();
  });

  it('handles the very edge of the image', () => {
    expect(pixelAt(bounds, grid, 31.5, 74.3)).toBe(0.7); // south-west corner
    expect(pixelAt(bounds, grid, 31.51, 74.31)).toBe(0.5); // north-east corner
  });
});

describe('legendGradient', () => {
  it('is built from the same colour stops', () => {
    expect(legendGradient).toContain('rgb(215, 48, 39) 0%');
    expect(legendGradient).toContain('rgb(26, 152, 80) 100%');
  });
});