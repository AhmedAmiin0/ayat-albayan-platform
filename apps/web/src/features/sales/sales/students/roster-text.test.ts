import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { rosterAttendanceLine, rosterScheduleLine } from './roster-text';

const S = t.sales.allStudents;
const asma = { display_name_ar: 'أسماء حسين', display_name_en: 'Asma Hussein' };
// Sun 1, Tue 3, Thu 5 November 2026 at 08:00Z: 11:00 in Riyadh, 10:00 in Cairo.
const weekly = [{ next: ['2026-11-01T08:00:00.000Z', '2026-11-03T08:00:00.000Z', '2026-11-05T08:00:00.000Z'], teacher: asma }];
const ar12 = { cycle: '12', locale: 'ar' } as const;

describe('«كل الطلاب» roster lines (owner 2026-10-30)', () => {
  it('the schedule in the viewer zone and cycle, with the teacher in the UI language', () => {
    expect(rosterScheduleLine({ weekly }, ar12, 'Asia/Riyadh')).toBe('الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين');
    expect(rosterScheduleLine({ weekly }, { cycle: '24', locale: 'ar' }, 'Africa/Cairo')).toBe(
      'الأحد، الثلاثاء، الخميس · 10:00 · أسماء حسين',
    );
    expect(rosterScheduleLine({ weekly }, { cycle: '24', locale: 'en' }, 'Asia/Riyadh')).toContain('Asma Hussein');
  });

  it('no fixed schedule, and nothing from an old cache', () => {
    expect(rosterScheduleLine({ weekly: [] }, ar12, 'Asia/Riyadh')).toBe(S.noSchedule);
    expect(rosterScheduleLine({}, ar12, 'Asia/Riyadh')).toBeNull();
  });

  it('attendance of the package or the last 30 days', () => {
    expect(rosterAttendanceLine({ attendance: { attended: 7, held: 9, basis: 'subscription' } })).toBe('حضر 7 من 9 في الباقة الحالية');
    expect(rosterAttendanceLine({ attendance: { attended: 1, held: 2, basis: 'recent' } })).toBe('حضر 1 من 2 في آخر 30 يومًا');
    expect(rosterAttendanceLine({ attendance: { attended: 0, held: 0, basis: 'subscription' } })).toBe(S.noHeldPackage);
    expect(rosterAttendanceLine({ attendance: { attended: 0, held: 0, basis: 'recent' } })).toBe(S.noHeldRecent);
    expect(rosterAttendanceLine({})).toBeNull();
  });
});
