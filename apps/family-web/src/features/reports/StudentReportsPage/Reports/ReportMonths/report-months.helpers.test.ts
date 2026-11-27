import { dateText } from '@ab/time';
import { locale } from '@ab/web-kit';
import { describe, expect, it } from 'vitest';
import { monthTitle } from './report-months.helpers';

const MONTH = { month: 'long', year: 'numeric' } as const;
const named = (iso: string, tz: string) => dateText(new Date(iso), { tz, locale }, MONTH);

describe('monthTitle', () => {
  it('names the month the key gives, on the far east and far west clocks alike', () => {
    expect(monthTitle('2026-01')).toBe(named('2026-01-15T00:00:00Z', 'Pacific/Kiritimati'));
    expect(monthTitle('2026-01')).toBe(named('2026-01-15T23:00:00Z', 'Pacific/Pago_Pago'));
  });

  it('two months give two titles', () => {
    expect(monthTitle('2026-01')).not.toBe(monthTitle('2026-02'));
  });
});
