import { describe, it, expect, vi } from 'vitest';
import {
  shiftDate, periods, splitSeries, average, signed, changeColor, compareGrids, zoneAverages, toCsv, downloadCsv,
} from './trends';

describe('dates and periods', () => {
  it('moves a date forwards and backwards across month and year ends', () => {
    expect(shiftDate('2025-03-01', -1)).toBe('2025-02-28');
    expect(shiftDate('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('makes two back-to-back periods of the same length', () => {
    expect(periods('2025-05-18', 30)).toEqual({
      current: { from: '2025-04-19', to: '2025-05-18' },
      previous: { from: '2025-03-20', to: '2025-04-18' },
    });
    expect(periods('2025-05-18', 7).current).toEqual({ from: '2025-05-12', to: '2025-05-18' });
  });

  it('splits a list of days into the two periods', () => {
    const per = periods('2025-05-18', 2); // current: 17-18, previous: 15-16
    const list = ['2025-05-15', '2025-05-16', '2025-05-17', '2025-05-18'].map((date) => ({ date }));
    const { current, previous } = splitSeries(list, per);
    expect(current.map((r) => r.date)).toEqual(['2025-05-17', '2025-05-18']);
    expect(previous.map((r) => r.date)).toEqual(['2025-05-15', '2025-05-16']);
  });
});

describe('numbers', () => {
  it('averages daily values and handles an empty list', () => {
    expect(average([{ avgNdvi: 0.6 }, { avgNdvi: 0.8 }])).toBeCloseTo(0.7);
    expect(average([])).toBeNull();
  });

  it('writes signed numbers', () => {
    expect(signed(0.08)).toBe('+0.08');
    expect(signed(-0.05)).toBe('-0.05');
    expect(signed(0)).toBe('0.00');
  });
});

describe('change bands', () => {
  it('picks the band for a change in NDVI', () => {
    expect(changeColor(0.3)).toEqual([26, 152, 80]);
    expect(changeColor(0.1)).toEqual([166, 217, 106]);
    expect(changeColor(0)).toEqual([235, 235, 235]);
    expect(changeColor(-0.1)).toEqual([253, 174, 97]);
    expect(changeColor(-0.4)).toEqual([215, 48, 39]);
  });
});

describe('compareGrids', () => {
  const latest = [[0.7, 0.5], [0.4, null]];
  const earlier = [[0.5, 0.5], [0.6, null]];

  it('gives the change per pixel and the share improved or declined', () => {
    const { grid, improved, declined } = compareGrids(latest, earlier);
    expect(grid).toEqual([[0.2, 0], [-0.2, null]]);
    expect(improved).toBe(33);
    expect(declined).toBe(33);
  });

  it('ignores cells that are empty on either day', () => {
    expect(compareGrids([[0.5, null]], [[null, 0.5]]).grid).toEqual([[null, null]]);
  });
});

describe('zoneAverages', () => {
  it('averages each half of the field and the whole field', () => {
    expect(zoneAverages([[0.7, 0.5], [0.4, null]])).toEqual({
      'North Zone': 0.6, 'South Zone': 0.4, 'East Zone': 0.5, 'West Zone': 0.55, 'Overall Field': 0.53,
    });
  });
});

describe('CSV export', () => {
  it('writes a header and one line per day', () => {
    expect(toCsv([{ date: '2025-05-17', avgNdvi: 0.68 }, { date: '2025-05-18', avgNdvi: 0.7 }])).toBe(
      'date,average_ndvi\n2025-05-17,0.68\n2025-05-18,0.7'
    );
  });

  it('downloads through a temporary link', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadCsv('ndvi.csv', 'a,b');
    expect(click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});