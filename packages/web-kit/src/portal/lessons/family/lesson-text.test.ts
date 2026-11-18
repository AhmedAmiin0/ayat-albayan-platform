import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { lesson } from '@ab/web-kit/portal/portal.fixtures';
import { dayName, spanText, tileOf, viewerLine, withLine } from './lesson-text';

const clock = { tz: 'Africa/Cairo', cycle: '24', locale: 'ar' } as const;
const l = lesson(); // 16:00–16:30 UTC on 27 Oct 2026: 19:00–19:30 in Cairo (summer time)

describe('the family cards’ words', () => {
  it('the time span on the family clock', () => {
    expect(spanText(l, clock)).toBe('19:00 – 19:30');
  });

  it('«اليوم» / «غدًا», else the date', () => {
    expect(dayName(l, clock, new Date('2026-10-27T08:00:00Z'))).toBe(t.portal.app.lesson.today);
    expect(dayName(l, clock, new Date('2026-10-26T08:00:00Z'))).toBe(t.portal.app.lesson.tomorrow);
    expect(dayName(l, clock, new Date('2026-10-20T08:00:00Z'))).toContain('27');
    expect(tileOf(l, clock)).toEqual({ weekday: 'الثلاثاء', day: '27' });
  });

  it('the teacher and length; the length alone when no teacher is named', () => {
    expect(withLine(l)).toContain('أبرار');
    expect(withLine(l)).toContain('30');
    const none = lesson({ teacher: { display_name_ar: '', display_name_en: null } });
    expect(withLine(none)).toBe(t.portal.app.lesson.minutes.replace('{n}', '30'));
  });

  it('the viewer’s own time only when their clock reads differently', () => {
    expect(viewerLine(l.starts_at, clock, 'Africa/Cairo')).toBeNull();
    expect(viewerLine(l.starts_at, clock, 'Asia/Dubai')).toContain('20:00');
  });
});
