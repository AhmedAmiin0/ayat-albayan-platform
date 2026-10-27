import { t } from '@/core/lib/i18n/i18n';
import { daysText, requestDays, takenDays, takenTexts, weekdayName } from './course-days';

const sep = t.common.listSeparator;
const at = (day: string, time: string) => t.booking.dayAt.replace('{day}', day).replace('{time}', time);
const RIYADH = 'Asia/Riyadh';
// Riyadh: الأحد 11 Oct 17:00, الخميس 15 Oct 18:00, السبت 17 Oct 09:00.
const SUN = '2026-10-11T14:00:00.000Z';
const THU = '2026-10-15T15:00:00.000Z';
const SAT = '2026-10-17T06:00:00.000Z';

describe('daysText: a course’s days with their times', () => {
  const days = [
    { weekday: 4, startTimeLocal: '18:00' },
    { weekday: 0, startTimeLocal: '17:00' },
    { weekday: 6, startTimeLocal: '09:00' },
  ];
  it('names each weekday with its time, السبت → الجمعة', () => {
    const want = [at(weekdayName(6), '09:00'), at(weekdayName(0), '17:00'), at(weekdayName(4), '18:00')];
    expect(daysText(days, RIYADH, '24')).toBe(want.join(sep));
  });
  it('outside Riyadh each time names the city (the web’s dayAtText)', () => {
    const inCairo = t.schedule.inCity.replace('{time}', '09:00').replace('{city}', t.tz['Africa/Cairo']);
    expect(daysText(days, 'Africa/Cairo', '24').startsWith(at(weekdayName(6), inCairo))).toBe(true);
  });
  it('no days → empty', () => expect(daysText([], RIYADH, '24')).toBe(''));
});

describe('requestDays: the weekdays and times a change asks for', () => {
  it('the head time for every day, a day’s own time from dayTimes', () => {
    const body = { byday: [0, 4], startTimeLocal: '18:00', dayTimes: [{ weekday: 0, startTimeLocal: '17:00' }] };
    expect(requestDays(body)).toEqual(
      expect.arrayContaining([
        { weekday: 0, startTimeLocal: '17:00' },
        { weekday: 4, startTimeLocal: '18:00' },
      ]),
    );
    expect(requestDays(body)).toHaveLength(2);
  });
});

describe('takenDays: only clashes on a day still holding its prefilled pick (the web’s rule)', () => {
  const prefilled = [SUN, THU, SAT];
  it('each such weekday once, السبت first', () => {
    const conflicts = [{ startsAt: THU }, { startsAt: SAT }, { startsAt: '2026-10-22T15:00:00.000Z' }];
    expect(takenDays({ picks: prefilled, prefilled, tz: RIYADH }, conflicts)).toEqual([6, 4]);
  });
  it('a day she picked again is not named', () => {
    const picks = [SUN, '2026-10-15T17:00:00.000Z', SAT]; // Thursday moved to 20:00
    expect(takenDays({ picks, prefilled, tz: RIYADH }, [{ startsAt: '2026-10-15T17:00:00.000Z' }])).toEqual([]);
  });
  it('nothing prefilled → nothing named', () => {
    expect(takenDays({ picks: [SUN], prefilled: [], tz: RIYADH }, [{ startsAt: SUN }])).toEqual([]);
  });
  it('reads the zone: late Saturday UTC is Sunday in Riyadh', () => {
    const late = '2026-10-10T22:30:00.000Z';
    expect(takenDays({ picks: [late], prefilled: [late], tz: RIYADH }, [{ startsAt: late }])).toEqual([0]);
  });
  it('one grammatical line per day', () => {
    const lines = takenTexts({ picks: prefilled, prefilled, tz: RIYADH }, [{ startsAt: SUN }, { startsAt: THU }]);
    expect(lines).toEqual([0, 4].map((w) => t.booking.courseChange.continueTaken.replace('{day}', weekdayName(w))));
  });
  it('an unknown weekday reads empty', () => expect(weekdayName(9)).toBe(''));
});
