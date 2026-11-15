import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { api } from '../services/api';
import { periods, todayUtc } from '../utils/trends';

vi.mock('../services/api', () => ({ api: vi.fn() }));
vi.mock('../services/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Areeba' } }) }));
vi.mock('../components/NdviMapView', () => ({ default: () => <div>MAP</div> }));

const ring = [[[74.3, 31.5], [74.31, 31.5], [74.31, 31.51], [74.3, 31.51], [74.3, 31.5]]];
const aois = [{ _id: 'a1', name: 'North Block', areaHa: 105.7, geometry: { coordinates: ring } }];
const per = periods(todayUtc(), 30);
const bounds = { south: 31.5, west: 74.3, north: 31.51, east: 74.31 };

// 30 days at 0.6, then 30 days at 0.68 (so the change is +0.08), as the server would return them.
const results = Array.from({ length: 60 }, (_, i) => {
  const [y, m, d] = per.previous.from.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
  return { date, avgNdvi: date >= per.current.from ? 0.68 : 0.6 };
});

const renderPage = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

beforeEach(() => {
  api.mockReset();
  api.mockImplementation(async (path, opts) => {
    if (path === '/aois') return { aois };
    if (path === '/ndvi/series') return { results };
    return { result: { id: 'r', aoi: opts.body.aoiId, date: opts.body.date, avgNdvi: 0.68, bounds }, pixels: [[0.68]] };
  });
});

describe('Dashboard', () => {
  it('greets the farmer by name', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Areeba!/ })).toBeInTheDocument();
  });

  it('asks the server for 60 days ending today, and for today\'s grid', async () => {
    renderPage();
    await screen.findByText('MAP');
    expect(api).toHaveBeenCalledWith('/ndvi/series', { method: 'POST', body: { aoiId: 'a1', from: per.previous.from, to: per.current.to } });
    expect(api).toHaveBeenCalledWith('/ndvi/calculate', { method: 'POST', body: { aoiId: 'a1', date: per.current.to } });
  });

  it('shows the status in plain words, without naming a cause', async () => {
    renderPage();
    const card = (await screen.findByRole('heading', { name: 'Current NDVI status' })).closest('.card');
    expect(card).toHaveTextContent('Healthy');
    expect(screen.getByText(/Your crops look good/)).toBeInTheDocument();
    expect(screen.getByText('Average NDVI today: 0.68')).toBeInTheDocument();
  });

  it('shows the 30 day average and how it changed', async () => {
    renderPage();
    expect(await screen.findByText('+0.08 vs previous 30 days')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /latest 0.68/ })).toBeInTheDocument();
  });

  it('links to the full NDVI map', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /Open NDVI Map/ })).toHaveAttribute('href', '/ndvi-map');
  });

  it('shows the colour guide and the disclaimer', async () => {
    renderPage();
    expect(await screen.findByText(/NDVI guide/)).toBeInTheDocument();
    expect(screen.getByText(/do not confirm any disease/)).toBeInTheDocument();
  });

  it('tells a farmer with no field to ask the admin', async () => {
    api.mockImplementation(async () => ({ aois: [] }));
    renderPage();
    expect(await screen.findByText(/No field has been assigned/)).toBeInTheDocument();
  });

  it('shows the server\'s message when the data cannot be loaded', async () => {
    api.mockImplementation(async (path) => {
      if (path === '/aois') return { aois };
      throw new Error('Server error');
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
  });
});