import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { COURSE } from './change-fixture';
import { currentDaysText, newDaysText, requestDays } from './change-text';

const at = (weekday: 0 | 1 | 3 | 6, time: string) => t.booking.dayAt.replace('{day}', t.enums.weekday[weekday]).replace('{time}', time);

describe('«تغيير أيام الحلقات»: the current and new days as text (owner 2026-10-18)', () => {
  it('the current days, Saturday first, each with its own time', () => {
    const days = [{ weekday: 0, startTimeLocal: '17:00' }, { weekday: 6, startTimeLocal: '09:00' }];
    expect(currentDaysText(days, COURSE.tz)).toBe(
      t.booking.courseChange.currentDays.replace('{days}', [at(6, '09:00'), at(0, '17:00')].join(t.common.listSeparator)),
    );
  });

  it('the new days from the request: dayTimes over the shared time', () => {
    const req = { byday: [1, 3], startTimeLocal: '18:00', dayTimes: [{ weekday: 3, startTimeLocal: '19:30' }] };
    expect(requestDays(req)).toEqual([
      { weekday: 1, startTimeLocal: '18:00' },
      { weekday: 3, startTimeLocal: '19:30' },
    ]);
    expect(newDaysText(req, COURSE.tz)).toBe(
      t.booking.courseChange.newDays.replace('{days}', [at(1, '18:00'), at(3, '19:30')].join(t.common.listSeparator)),
    );
    expect(requestDays({ byday: [0], startTimeLocal: '17:00' })).toEqual([{ weekday: 0, startTimeLocal: '17:00' }]);
  });
});
