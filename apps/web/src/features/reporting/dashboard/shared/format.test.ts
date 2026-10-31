import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { amount, currencyLabel, monthLabel, percent, rateDate, whenViewer } from './format';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;
const RIYADH = 'Asia/Riyadh';
const Z24 = { ...C24, tz: RIYADH };

describe('dashboard format (Western digits)', () => {
  it('amounts are whole, comma-grouped, signed', () => {
    expect(amount(1287.88)).toBe('1,288');
    expect(amount(-1154.7)).toBe('-1,155');
    expect(amount(0)).toBe('0');
  });

  it('percent rounds; nothing to divide by is a dash', () => {
    expect(percent(0.4567)).toBe('46%');
    expect(percent(null)).toBe('—');
  });

  it('site currencies get their symbol, others their code', () => {
    expect(currencyLabel('SAR')).toBe(t.pricing.currencies.SAR);
    expect(currencyLabel('EGP')).toBe('EGP');
  });

  it('month and Riyadh time labels carry no Eastern digits', () => {
    expect(monthLabel('2026-09')).toMatch(/2026/);
    expect(whenViewer('2026-10-01T13:00:00Z', Z24)).toMatch(/1 .* 16:00$/);
    expect(rateDate('2026-10-01T22:00:00Z', RIYADH)).toMatch(/2/);
    const labels = [monthLabel('2026-09'), whenViewer('2026-10-01T13:00:00Z', Z24)];
    for (const s of labels) expect(s).not.toMatch(/[٠-٩]/);
  });

  it('reads in the zone it is given', () => {
    expect(whenViewer('2026-10-01T13:00:00Z', { ...C24, tz: 'Africa/Cairo' })).toMatch(/16:00$/);
    expect(whenViewer('2026-10-01T13:00:00Z', { ...C24, tz: 'UTC' })).toMatch(/13:00$/);
    // 22:00 UTC is already the 2nd in Riyadh, still the 1st in UTC
    const late = '2026-10-01T22:00:00Z';
    expect(rateDate(late, 'UTC')).not.toBe(rateDate(late, RIYADH));
  });
});
