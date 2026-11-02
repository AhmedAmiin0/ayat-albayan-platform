import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { otherDayNote } from './other-day';

// Sunday 1 Nov 2026 00:30 in Riyadh = Saturday 31 Oct 23:30 in Cairo (UTC+2 after its DST ended).
const LATE = '2026-10-31T21:30:00.000Z';

describe('otherDayNote (docs/34 b: /sales/schedule pages by Riyadh days)', () => {
  it('names the viewer’s day when it is not the Riyadh day', () => {
    const saturday = t.enums.weekday['6'];
    expect(otherDayNote(LATE, 'Africa/Cairo')).toBe(
      t.sales.academySchedule.otherDay.replace('{day}', saturday),
    );
  });

  it('says nothing on the same day, or for a Riyadh viewer', () => {
    expect(otherDayNote(LATE, 'Asia/Riyadh')).toBeNull();
    expect(otherDayNote('2026-10-31T15:00:00.000Z', 'Africa/Cairo')).toBeNull();
  });
});
