import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ColumnChartShowcase } from '@ab/web-kit/components/ui/charts/ColumnChart/ColumnChart.showcase';

it('draws a staff and a family example in every direction and theme', () => {
  render(<ColumnChartShowcase />);
  for (const key of ['rtl-light', 'rtl-dark', 'ltr-light', 'ltr-dark']) {
    const frame = screen.getByRole('region', { name: key });
    expect(within(frame).getAllByRole('img')).toHaveLength(2);
    expect(frame.getAttribute('dir')).toBe(key.slice(0, 3));
    expect(frame.getAttribute('data-theme')).toBe(key.slice(4));
  }
});
