import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { takenDays, takenTexts } from './course-taken';
import type { BookingDraft } from '../../draft/draft';

const SUN = '2026-10-11T14:00:00.000Z'; // Sunday 17:00 Riyadh
const SUN_LATER = '2026-10-11T15:00:00.000Z';
const WED = '2026-10-14T16:30:00.000Z'; // Wednesday 19:30
const course = { perWeek: 2, lessonsTotal: 8, package: '8', startsOn: '2026-10-11', prefilled: [
  { at: SUN, weekday: 0, startTimeLocal: '17:00' },
  { at: WED, weekday: 3, startTimeLocal: '19:30' },
] } as const;
const draft = (startsAt: string, extra: string[]): Pick<BookingDraft, 'course' | 'tz' | 'startsAt' | 'extra' | 'kind'> => ({
  course,
  tz: 'Asia/Riyadh',
  startsAt,
  extra,
  kind: 'package',
});
const clash = (startsAt: string) => ({ kind: 'teacher_busy' as const, startsAt, endsAt: startsAt });

describe('a renewal’s prefilled day that is no longer free (owner 2026-10-18)', () => {
  it('names the weekday of a clash on a prefilled pick, in a later week too', () => {
    expect(takenDays(draft(SUN, [WED]), [clash('2026-10-18T14:00:00.000Z')])).toEqual([0]);
    expect(takenTexts(draft(SUN, [WED]), [clash(WED)])).toEqual([
      t.booking.courseChange.continueTaken.replace('{day}', t.enums.weekday[3]),
    ]);
  });

  it('a day she already moved to another time, or a course not prefilled, says nothing', () => {
    expect(takenDays(draft(SUN_LATER, [WED]), [clash(SUN_LATER)])).toEqual([]);
    expect(takenDays({ ...draft(SUN, [WED]), course: { ...course, prefilled: [] } }, [clash(SUN)])).toEqual([]);
    expect(takenDays({ ...draft(SUN, [WED]), course: null }, [clash(SUN)])).toEqual([]);
  });
});
