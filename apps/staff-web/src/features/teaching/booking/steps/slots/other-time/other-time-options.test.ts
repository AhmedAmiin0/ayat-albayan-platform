import { describe, expect, it } from 'vitest';
import { locale, t } from '@ab/web-kit';
import { dayOptions, daysOf, timeOptions } from './other-time-options';
import { outsideQuery } from './use-outside-slots';

// Tue 1 Dec 2026: Cairo UTC+2, Riyadh UTC+3. 21:30Z is 23:30 Tue in Cairo, 00:30 Wed in Riyadh.
const at = (startsAt: string, inside: boolean) => ({
  starts_at: startsAt,
  ends_at: startsAt,
  inside_hours: inside,
});
const SLOTS = [
  at('2026-12-01T21:30:00.000Z', false),
  at('2026-12-01T09:00:00.000Z', false),
  at('2026-12-01T14:00:00.000Z', true),
];
const C24 = { cycle: '24', locale } as const;

describe('«وقت آخر» chips (owner 2026-11-21)', () => {
  it('groups by the viewer zone: Riyadh has two days, Cairo one', () => {
    expect([...daysOf(SLOTS, 'Asia/Riyadh').keys()]).toEqual(['2026-12-01', '2026-12-02']);
    expect([...daysOf(SLOTS, 'Africa/Cairo').keys()]).toEqual(['2026-12-01']);
  });

  it('labels each day in the viewer zone, Western digits', () => {
    const [tue, wed] = dayOptions(daysOf(SLOTS, 'Asia/Riyadh'), 'Asia/Riyadh');
    expect([tue?.value, wed?.value]).toEqual(['2026-12-01', '2026-12-02']);
    expect(tue?.label.startsWith(t.enums.weekday[2])).toBe(true);
    expect(wed?.label.startsWith(t.enums.weekday[3])).toBe(true);
  });

  it('the viewer clock first, the family clock beside it only when it differs, in order', () => {
    const riyadh = daysOf(SLOTS, 'Asia/Riyadh').get('2026-12-01') ?? [];
    expect(
      timeOptions(riyadh, { viewer: 'Asia/Riyadh', family: 'Asia/Riyadh' }, C24).map(
        (o) => o.label,
      ),
    ).toEqual(['12:00', '17:00']);
    const cairo = daysOf(SLOTS, 'Africa/Cairo').get('2026-12-01') ?? [];
    const labels = timeOptions(cairo, { viewer: 'Africa/Cairo', family: 'Asia/Riyadh' }, C24).map(
      (o) => o.label,
    );
    expect(labels[0]).toBe('11:00 · 12:00');
    expect(labels[2]?.startsWith('23:30 · 00:30')).toBe(true);
  });

  it('the query has the grid fields only: no time from the browser', () => {
    expect(outsideQuery({ teacherId: 't', durationMin: 45, studentIds: [] })).toBe(
      'teacherId=t&durationMin=45',
    );
    expect(
      outsideQuery({
        teacherId: 't',
        durationMin: 30,
        studentIds: ['a', 'b'],
        excludeLessonId: 'l',
      }),
    ).toBe('teacherId=t&durationMin=30&studentIds=a%2Cb&excludeLessonId=l');
  });
});
