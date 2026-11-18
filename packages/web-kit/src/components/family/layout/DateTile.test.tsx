import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateTile } from './DateTile';

const LATE = '2026-11-12T22:30:00Z';

describe('DateTile (boards: the weekday over the day)', () => {
  it('the day in the family’s zone: Friday 13 in Riyadh, Thursday 12 in UTC', () => {
    const riyadh = render(<DateTile at={LATE} tz="Asia/Riyadh" />).container;
    expect(riyadh.textContent).toBe('الجمعة13');
    const utc = render(<DateTile at={new Date(LATE)} tz="UTC" />).container;
    expect(utc.textContent).toBe('الخميس12');
  });

  it('decorative; shown by default', () => {
    const tile = render(<DateTile at={LATE} tz="UTC" />).container.firstElementChild;
    expect(tile?.getAttribute('aria-hidden')).toBe('true');
    expect(tile?.className).toMatch(/(^|\s)grid(\s|$)/);
    expect(tile?.className).not.toContain('hidden');
  });

  it('familyOnly (a panel staff share): hidden, shown under data-skin=family', () => {
    const tile = render(<DateTile at={LATE} tz="UTC" familyOnly />).container.firstElementChild;
    expect(tile?.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(tile?.className).toContain('family:grid');
  });
});
