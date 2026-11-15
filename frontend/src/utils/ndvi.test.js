import { describe, expect, it } from 'vitest';
import {
  STOPS,
  classify,
  legendGradient,
  ndviColor,
  pixelAt,
  shareByClass,
} from './ndvi';

describe('ndviColor', () => {
  it('uses the end colours for -1 and 1', () => {
    expect(ndviColor(-1)).toEqual(STOPS[0][1]);
    expect(ndviColor(1)).toEqual(STOPS[STOPS.length - 1][1]);
  });

  it('clamps values outside -1 to 1', () => {
    expect(ndviColor(-1.5)).toEqual(ndviColor(-1));
    expect(ndviColor(1.7)).toEqual(ndviColor(1));
  });

  it('hits a stop colour exactly and blends halfway between two stops', () => {
    expect(ndviColor(0)).toEqual(STOPS[2][1]);
    expect(ndviColor(0.83)).toEqual([96, 185, 93]);
  });
});

describe('classify', () => {
  it('splits at 0.33 and 0.66', () => {
    expect(classify(0.2)).toBe('Low (Stress)');
    expect(classify(0.33)).toBe('Moderate');
    expect(classify(0.5)).toBe('Moderate');
    expect(classify(0.66)).toBe('Healthy');
    expect(classify(0.8)).toBe('Healthy');
  });
});

describe('shareByClass', () => {
  it('counts only pixels inside the AOI', () => {
    const pixels = [
      [0.2, null],
      [0.5, 0.8],
    ];
    expect(shareByClass(pixels)).toEqual({
      'Low (Stress)': 33,
      Moderate: 33,
      Healthy: 33,
    });
  });

  it('returns zeros for an empty grid', () => {
    expect(shareByClass([])).toEqual({
      'Low (Stress)': 0,
      Moderate: 0,
      Healthy: 0,
    });
  });
});

describe('pixelAt', () => {
  const bounds = { north: 10, south: 0, east: 10, west: 0 };
  const pixels = [
    [0.1, 0.2],
    [0.3, null],
  ];

  it('finds the pixel under a position', () => {
    expect(pixelAt(bounds, pixels, 7.5, 2.5)).toBe(0.1);
    expect(pixelAt(bounds, pixels, 7.5, 7.5)).toBe(0.2);
  });

  it('returns null for an empty cell and for positions outside the image', () => {
    expect(pixelAt(bounds, pixels, 2.5, 7.5)).toBeNull();
    expect(pixelAt(bounds, pixels, 15, 5)).toBeNull();
  });

  it('handles the very edge of the image', () => {
    expect(pixelAt(bounds, pixels, 11, 11)).toBeNull();
  });
});

describe('legendGradient', () => {
  it('is built from the same colour stops', () => {
    expect(legendGradient).toContain('rgb(30, 64, 124) 0%');
    expect(legendGradient).toContain('rgb(26, 152, 80) 100%');
  });
});