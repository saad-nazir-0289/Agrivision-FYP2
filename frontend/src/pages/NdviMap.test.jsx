import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NdviMap from './NdviMap';
import { api } from '../services/api';

vi.mock('../services/api', () => ({ api: vi.fn() }));
// Leaflet needs a real browser, so the map is replaced by three buttons that "move the pointer".
vi.mock('../components/NdviMapView', () => ({
  default: ({ onProbe }) => (
    <div>
      <button onClick={() => onProbe({ lat: 31.5075, lng: 74.3025 })}>probe low</button>
      <button onClick={() => onProbe({ lat: 31.5025, lng: 74.3025 })}>probe healthy</button>
      <button onClick={() => onProbe({ lat: 31.5025, lng: 74.3075 })}>probe outside</button>
    </div>
  ),
}));

const ring = [[[74.3, 31.5], [74.31, 31.5], [74.31, 31.51], [74.3, 31.51], [74.3, 31.5]]];
const aois = [
  { _id: 'a1', name: 'North Block', areaHa: 105.7, geometry: { coordinates: ring } },
  { _id: 'a2', name: 'South Block', areaHa: 80.2, geometry: { coordinates: ring } },
];
const pixels = [[0.2, 0.5], [0.7, null]];
const todayUtc = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  api.mockReset();
  api.mockImplementation(async (path, opts) => {
    if (path === '/aois') return { aois };
    return {
      result: {
        id: 'r1', aoi: opts.body.aoiId, date: opts.body.date, avgNdvi: 0.68, minNdvi: 0.2, maxNdvi: 0.7,
        source: 'mock', bounds: { south: 31.5, west: 74.3, north: 31.51, east: 74.31 },
      },
      pixels,
    };
  });
});

const calls = () => api.mock.calls.filter(([path]) => path === '/ndvi/calculate').map(([, opts]) => opts.body);

describe('NDVI map page', () => {
  it('tells a farmer with no assigned field to ask the admin', async () => {
    api.mockImplementation(async () => ({ aois: [] }));
    render(<NdviMap />);
    expect(await screen.findByText(/No field has been assigned/)).toBeInTheDocument();
  });

  it('lists only the farmer\'s fields and loads today for the first one', async () => {
    render(<NdviMap />);
    expect(await screen.findByText('Average NDVI on ' + todayUtc)).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['North Block (105.7 ha)', 'South Block (80.2 ha)']);
    expect(calls()).toEqual([{ aoiId: 'a1', date: todayUtc }]);
    expect(screen.getByText('0.68')).toBeInTheDocument();
    expect(screen.getByText(/demo data/)).toBeInTheDocument();
  });

  it('stops the date picker at today', async () => {
    render(<NdviMap />);
    expect(await screen.findByLabelText('Select date')).toHaveAttribute('max', todayUtc);
  });

  it('asks again when the date or the field changes', async () => {
    render(<NdviMap />);
    await screen.findByText('Average NDVI on ' + todayUtc);
    fireEvent.change(screen.getByLabelText('Select date'), { target: { value: '2025-05-18' } });
    expect(await screen.findByText('Average NDVI on 2025-05-18')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Select AOI'), { target: { value: 'a2' } });
    await waitFor(() => expect(calls().at(-1)).toEqual({ aoiId: 'a2', date: '2025-05-18' }));
  });

  it('shows the share of the field in each band', async () => {
    render(<NdviMap />);
    expect(await screen.findByText('Low (Stress): 33% of the field')).toBeInTheDocument();
    expect(screen.getByText('Moderate: 33% of the field')).toBeInTheDocument();
    expect(screen.getByText('Healthy: 33% of the field')).toBeInTheDocument();
  });

  it('shows the value and band of the pixel under the pointer', async () => {
    render(<NdviMap />);
    fireEvent.click(await screen.findByText('probe low'));
    expect(screen.getByText('0.200')).toBeInTheDocument();
    fireEvent.click(screen.getByText('probe healthy'));
    expect(screen.getByText('0.700')).toBeInTheDocument();
    fireEvent.click(screen.getByText('probe outside'));
    expect(screen.getByText(/Move over the map/)).toBeInTheDocument();
  });

  it('shows the server\'s message when a result cannot be made', async () => {
    api.mockImplementation(async (path) => {
      if (path === '/aois') return { aois };
      throw new Error('date cannot be in the future');
    });
    render(<NdviMap />);
    expect(await screen.findByRole('alert')).toHaveTextContent('date cannot be in the future');
    expect(screen.queryByText('probe low')).not.toBeInTheDocument();
  });

  it('always shows the legend and the disclaimer', async () => {
    render(<NdviMap />);
    expect(await screen.findByText('NDVI legend')).toBeInTheDocument();
    expect(screen.getByText(/do not confirm any disease/)).toBeInTheDocument();
  });
});