import { t } from '@/core/lib/i18n/i18n';
import { ATTENDANCE_STYLE, totalsLines } from './attendance-text';

const zero = { present: 0, absent: 0, excused: 0, cancelled: 0, unmarked: 0 };

test('the totals line names every kind; «لم يُسجَّل» only when a day waits on it', () => {
  const s = t.sales.student;
  const line = s.totals.replace('{present}', '8').replace('{absent}', '1').replace('{excused}', '0').replace('{cancelled}', '2');
  expect(totalsLines({ ...zero, present: 8, absent: 1, cancelled: 2 })).toEqual([line]);
  expect(totalsLines({ ...zero, unmarked: 3 })[1]).toBe(s.unmarkedCount.replace('{n}', '3'));
});

test('attended reads as done, absent as struck, unmarked as waiting', () => {
  expect(ATTENDANCE_STYLE.present).toEqual({ tone: 'ok', glyph: 'fill' });
  expect(ATTENDANCE_STYLE.absent.tone).toBe('bad');
  expect(ATTENDANCE_STYLE.unmarked).toEqual({ tone: 'act', glyph: 'hollow' });
});
