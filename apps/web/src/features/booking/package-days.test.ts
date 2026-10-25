import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { packageDaysNote } from './package-days';

describe('packageDaysNote: the package and the weekly days agree', () => {
  it('8 a month on one day → «= مرتان في الأسبوع»', () => {
    expect(packageDaysNote('8', 1)).toBe(`الباقة ${t.enums.packageSize['8']} = ${t.booking.perWeek.two}`);
  });
  it('matching days, or a trial → no note', () => {
    expect(packageDaysNote('8', 2)).toBeNull();
    expect(packageDaysNote('12', 3)).toBeNull();
    expect(packageDaysNote('trial', 1)).toBeNull();
  });
  it('too many days is flagged too', () => {
    expect(packageDaysNote('4', 2)).toContain(t.booking.perWeek.one);
  });
});
