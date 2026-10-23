import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { matchesSetting, matchesText } from './settings-search';

describe('settings search', () => {
  it('an empty box matches everything', () => {
    expect(matchesSetting('booking_horizon_weeks', '')).toBe(true);
    expect(matchesText('أي نص', '   ')).toBe(true);
  });

  it('matches a setting by label, hint or row key, ignoring case and diacritics', () => {
    expect(matchesSetting('booking_horizon_weeks', 'مقدمًا')).toBe(true);
    expect(matchesSetting('booking_horizon_weeks', 'الأسابيع التي تُنشأ')).toBe(true);
    expect(matchesSetting('booking_horizon_weeks', 'HORIZON')).toBe(true);
    expect(matchesSetting('booking_horizon_weeks', 'عملة')).toBe(false);
    expect(matchesSetting('recording_retention_days', 'تَسْجِيلات')).toBe(true);
  });

  it('a nullable number also matches its switch words', () => {
    expect(matchesSetting('late_cancel_hours', t.settings.lateCancel)).toBe(true);
  });
});
