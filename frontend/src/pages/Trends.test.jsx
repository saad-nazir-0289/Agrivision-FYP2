import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Trends from './Trends';
import { api } from '../services/api';
import { periods, todayUtc, shiftDate } from '../utils/trends';

vi.mock('../services/api', () => ({ api: vi.fn() }));
vi.mock('../components/NdviMapView', () => ({ default: () => <div>CHANGE MAP</div> }));

const ring = [[[74.3, 31.5], [74.31, 31.5], [74.31, 31.51], [74.3, 31.51], [74.3, 31.5]]];
const aois = [{ _id: 'a1', name: 'North Block', areaHa: 105.7, geometry: { coordinates: ring } }];
const bounds = { south: 31.5, west: 74.3, north: 31.51, east: 74.31 };
const today = todayUtc();
const latestGrid = [[0.7, 0.5], [0.4, null]];
const earlierGrid = [[0.5, 0.5], [0.6, null]];

// Server-style daily results for whatever range was asked: 0.6 before the current period, 0.68 in it.
function seriesFor({ from, to }, days) {
  const per = periods(today, days);
  const out = [];
  for (let d = from; d <= to; d = shiftDate(d, 1)) out.push({ date: d, avgNdvi: d >= per.current.from ? 0.68 : 0.6 });
  return { results: out };
}

let days;
beforeEach(() => {
  days = 30;
  api.mockReset();
  api.mockImplementation(async (path, opts) => {
    if (path === '/aois') return { aois };
    if (path === '/ndvi/series') return seriesFor(opts.body, days);
    const isLatest = opts.body.date === today;
    return { result: { id: 'r', aoi: 'a1', date: opts.body.date, bounds }, pixels: isLatest ? latestGrid : earlierGrid };
  });
});

describe('Trends page', () => {
  it('asks for both periods and for the grids of the two dates to compare', async () => {
    render(<Trends />);
    await screen.findByText('CHANGE MAP');
    const per = periods(today, 30);
    expect(api).toHaveBeenCalledWith('/ndvi/series', { method: 'POST', body: { aoiId: 'a1', from: per.previous.from, to: today } });
    expect(api).toHaveBeenCalledWith('/ndvi/calculate', { method: 'POST', body: { aoiId: 'a1', date: today } });
    expect(api).toHaveBeenCalledWith('/ndvi/calculate', { method: 'POST', body: { aoiId: 'a1', date: per.previous.to } });
  });

  it('shows the four summary cards', async () => {
    render(<Trends />);
    const card = async (title) => (await screen.findByRole('heading', { name: title })).closest('.card');
    expect(await card('Average NDVI')).toHaveTextContent('0.68+13.3% vs previous 30 days');
    expect(await card('NDVI change')).toHaveTextContent('+0.08vs previous 30 days');
    expect(await card('Health improvement')).toHaveTextContent('33%');
    expect(await card('Health decline')).toHaveTextContent('33%');
  });

  it('shows the zone table with changes', async () => {
    render(<Trends />);
    const row = (await screen.findByText('North Zone')).closest('tr');
    expect(row).toHaveTextContent('0.50'); // earlier
    expect(row).toHaveTextContent('0.60'); // latest
    expect(row).toHaveTextContent('+0.10');
    expect(screen.getByText('Overall Field').closest('tr')).toHaveTextContent('0.53');
  });

  it('explains the change in one sentence', async () => {
    render(<Trends />);
    expect(await screen.findByText(/has improved compared to the previous 30 days, with overall NDVI increasing by 0.08/)).toBeInTheDocument();
  });

  it('draws the chart and the change map legend', async () => {
    render(<Trends />);
    expect(await screen.findByRole('img', { name: /latest 0.68/ })).toBeInTheDocument();
    expect(screen.getByText('Large decrease (below -0.15)')).toBeInTheDocument();
  });

  it('asks again for a shorter range', async () => {
    render(<Trends />);
    await screen.findByText('CHANGE MAP');
    days = 7;
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: '7' } });
    const per = periods(today, 7);
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/ndvi/series', { method: 'POST', body: { aoiId: 'a1', from: per.previous.from, to: today } })
    );
    expect(await screen.findByText('vs previous 7 days')).toBeInTheDocument();
  });

  it('downloads the period as a CSV file', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<Trends />);
    await screen.findByText('CHANGE MAP');
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(click).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('tells a farmer with no field to ask the admin', async () => {
    api.mockImplementation(async () => ({ aois: [] }));
    render(<Trends />);
    expect(await screen.findByText(/No field has been assigned/)).toBeInTheDocument();
  });

  it('shows the server\'s message when the data cannot be loaded', async () => {
    api.mockImplementation(async (path) => {
      if (path === '/aois') return { aois };
      throw new Error('Server error');
    });
    render(<Trends />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
  });
});