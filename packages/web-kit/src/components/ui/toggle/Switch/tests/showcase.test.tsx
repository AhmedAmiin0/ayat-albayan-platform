import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SwitchShowcase } from '@ab/web-kit/components/ui/toggle/Switch/Switch.showcase';

it('draws each state in every direction and theme', () => {
  render(<SwitchShowcase />);
  for (const key of ['rtl-light', 'rtl-dark', 'ltr-light', 'ltr-dark']) {
    const frame = screen.getByRole('region', { name: key });
    expect(within(frame).getAllByRole('switch')).toHaveLength(3);
    expect(frame.getAttribute('dir')).toBe(key.slice(0, 3));
    expect(frame.getAttribute('data-theme')).toBe(key.slice(4));
  }
});
