// «التكرار» days and «حتى» end dates as the old Apps Script writes them (invented values).
import { describe, expect, it } from 'vitest';
import { bookingStatus, parseRecurrence, weekday } from './values.schedule.ts';

describe('weekday spellings', () => {
  it.each([
    ['الاتنين', 1],
    ['الإثنين', 1],
    ['الاثنين', 1],
    ['الأربعاء', 3],
    ['الاربعاء', 3],
    ['الجمعة', 5],
    ['الجمعه', 5],
    ['الأحد', 0],
    ['الاحد', 0],
    ['السبت', 6],
    ['الثلاثاء', 2],
    ['الخميس', 4],
  ])('%s → %i', (day, n) => {
    expect(weekday(day)).toBe(n);
  });
});

describe('parseRecurrence «حتى»', () => {
  it('reads the series end as an inclusive local day, padded', () => {
    expect(parseRecurrence('أسبوعي: الإثنين,الاربعاء حتى 2026-11-30')).toEqual({
      byday: [1, 3],
      until: '2026-11-30',
    });
    expect(parseRecurrence('أسبوعي: الجمعه،الاحد حتى 2026-9-5')?.until).toBe('2026-09-05');
    expect(parseRecurrence('أسبوعي: السبت حتى2026-12-01')?.until).toBe('2026-12-01');
  });

  it('open-ended without «حتى»; undefined when a day is unknown', () => {
    expect(parseRecurrence('أسبوعي: الخميس')).toEqual({ byday: [4], until: null });
    expect(parseRecurrence('أسبوعي: يوم ما حتى 2026-12-01')).toBeUndefined();
  });

  it('knows every status the calendar sheet uses', () => {
    expect(bookingStatus('يحتاج تأكيد')).toBe('needs_confirmation');
    expect(['مؤكد', 'مشترك', 'مبدئي', 'تمت', 'ملغي'].map(bookingStatus)).toEqual([
      'confirmed',
      'subscribed',
      'tentative',
      'done',
      'cancelled',
    ]);
  });
});
