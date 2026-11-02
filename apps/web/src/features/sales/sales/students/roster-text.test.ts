import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { rosterAttendanceLine, rosterPackageLine, rosterScheduleLine } from './roster-text';

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

describe('rosterPackageLine (owner 2026-10-30: any student, no price)', () => {
  const pkg = {
    id: 'sub1', package: '8' as const, status: 'expired' as const, starts_on: '2026-09-01',
    renews_on: null, ended_at: '2026-09-29T21:30:00Z', projected_end_at: null,
    created_at: '2026-08-30T10:00:00Z', lessons_total: 8, lessons_used: 8, lessons_remaining: 0,
  };

  it('size · status, used, left, start and the Riyadh day it ended (LTR dates)', () => {
    expect(rosterPackageLine({ package: pkg })).toBe(
      [
        `${t.enums.packageSize['8']} · ${t.enums.subscriptionStatus.expired}`,
        'استُخدمت 8 من 8',
        'المتبقي: 0',
        'البدء: \u20662026-09-01\u2069',
        'الانتهاء: \u20662026-09-30\u2069',
      ].join(' · '),
    );
  });

  it('none: «لا توجد باقة حالية»; an old cache: null', () => {
    expect(rosterPackageLine({ package: null })).toBe(S.noPackage);
    expect(rosterPackageLine({})).toBeNull();
  });
});
