import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { BarListShowcase } from '@ab/web-kit/components/ui/charts/BarList/BarList.showcase';

it('draws a staff and a family example in every direction and theme', () => {
  render(<BarListShowcase />);
  for (const key of ['rtl-light', 'rtl-dark', 'ltr-light', 'ltr-dark']) {
    const frame = screen.getByRole('region', { name: key });
    expect(within(frame).getAllByRole('list')).toHaveLength(2);
    expect(frame.getAttribute('dir')).toBe(key.slice(0, 3));
    expect(frame.getAttribute('data-theme')).toBe(key.slice(4));
  }
});
