import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrendChart from './TrendChart';

const series = (values) => values.map((avgNdvi, i) => ({ date: `2025-05-${String(10 + i).padStart(2, '0')}`, avgNdvi }));

describe('TrendChart', () => {
  it('draws the line and describes it for screen readers', () => {
    const { container } = render(<TrendChart current={series([0.5, 0.6, 0.7])} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'NDVI from 2025-05-10 to 2025-05-12, latest 0.70');
    expect(container.querySelectorAll('path.line')).toHaveLength(1);
    expect(container.querySelectorAll('path.line-prev')).toHaveLength(0);
  });

  it('adds a dashed line for the previous period', () => {
    const { container } = render(<TrendChart current={series([0.5, 0.6])} previous={series([0.4, 0.45])} />);
    expect(container.querySelectorAll('path.line-prev')).toHaveLength(1);
  });

  it('shows axis labels, the latest value and three dates in the full version', () => {
    render(<TrendChart current={series([0.5, 0.6, 0.7])} />);
    expect(screen.getByText('1.0')).toBeInTheDocument();
    expect(screen.getByText('0.70')).toBeInTheDocument();
    expect(screen.getByText('10 May')).toBeInTheDocument();
    expect(screen.getByText('12 May')).toBeInTheDocument();
  });

  it('leaves out the axes in the compact version', () => {
    render(<TrendChart current={series([0.5, 0.6, 0.7])} compact />);
    expect(screen.queryByText('1.0')).not.toBeInTheDocument();
  });

  it('copes with a single day and with no data', () => {
    const { container, rerender } = render(<TrendChart current={series([0.5])} />);
    expect(container.querySelector('path.line')).toBeInTheDocument();
    rerender(<TrendChart current={[]} />);
    expect(screen.getByText('No data for this period.')).toBeInTheDocument();
  });
});