import { t } from '@/lib/i18n';
import { daysText, takenDays, weekdayName } from './course-days';

const sep = t.common.listSeparator;
const at = (day: string, time: string) => t.booking.dayAt.replace('{day}', day).replace('{time}', time);

describe('daysText: a course’s days with their times', () => {
  it('names each weekday with its time, in the given order', () => {
    const days = [
      { weekday: 0, startTimeLocal: '17:00' },
      { weekday: 4, startTimeLocal: '18:00' },
    ];
    expect(daysText(days)).toBe(`${at(t.enums.weekday['0'], '17:00')}${sep}${at(t.enums.weekday['4'], '18:00')}`);
  });
  it('no days → empty', () => expect(daysText([])).toBe(''));
});

describe('takenDays: the weekdays the clashes fall on, in the family’s zone', () => {
  it('each weekday once, in weekday order', () => {
    const conflicts = [
      { startsAt: '2026-10-15T15:00:00.000Z' }, // الخميس 18:00 Riyadh
      { startsAt: '2026-10-11T14:00:00.000Z' }, // الأحد 17:00
      { startsAt: '2026-10-22T15:00:00.000Z' }, // الخميس again
    ];
    expect(takenDays(conflicts, 'Asia/Riyadh')).toBe(`${weekdayName(0)}${sep}${weekdayName(4)}`);
  });
  it('reads the zone: late Saturday UTC is Sunday in Riyadh', () => {
    expect(takenDays([{ startsAt: '2026-10-10T22:30:00.000Z' }], 'Asia/Riyadh')).toBe(weekdayName(0));
  });
  it('an unknown weekday reads empty', () => expect(weekdayName(9)).toBe(''));
});
