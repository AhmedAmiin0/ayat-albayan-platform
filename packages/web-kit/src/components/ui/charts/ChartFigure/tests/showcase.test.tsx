import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ChartFigureShowcase } from '@ab/web-kit/components/ui/charts/ChartFigure/ChartFigure.showcase';

it('draws a staff and a family example in every direction and theme', () => {
  render(<ChartFigureShowcase />);
  for (const key of ['rtl-light', 'rtl-dark', 'ltr-light', 'ltr-dark']) {
    const frame = screen.getByRole('region', { name: key });
    expect(within(frame).getAllByRole('figure')).toHaveLength(2);
    expect(frame.getAttribute('dir')).toBe(key.slice(0, 3));
    expect(frame.getAttribute('data-theme')).toBe(key.slice(4));
  }
});
