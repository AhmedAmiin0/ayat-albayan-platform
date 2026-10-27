import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { amount, currencyLabel, monthLabel, percent, rateDate, whenRiyadh } from './format';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

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
    expect(whenRiyadh('2026-10-01T13:00:00Z', C24)).toMatch(/1 .* 16:00$/);
    expect(rateDate('2026-10-01T22:00:00Z')).toMatch(/2/);
    for (const s of [monthLabel('2026-09'), whenRiyadh('2026-10-01T13:00:00Z', C24)]) expect(s).not.toMatch(/[٠-٩]/);
  });
});
