import { t } from '@/core/lib/i18n/i18n';
import { weeklySlot } from './fixtures';
import { slotLines, slotMeta, studentLine, weeklyLine } from './schedule-text';

const s = t.sales.student.schedule;
const CAIRO = 'عند الطالب: الأحد · الثلاثاء · الخميس الساعة 19:00 بتوقيت القاهرة';

test('the weekly line: the days السبت → الجمعة on the viewer clock (Riyadh here), 24 h and 12 h', () => {
  expect(weeklyLine(weeklySlot, '24')).toBe('الأحد · الثلاثاء · الخميس الساعة 20:00');
  expect(weeklyLine(weeklySlot, '12')).toBe('الأحد · الثلاثاء · الخميس الساعة 8:00 م');
  // Saturday first in the academy week, whatever comes next.
  expect(weeklyLine({ next: ['2026-11-01T17:00:00.000Z', '2026-11-07T17:00:00.000Z'] }, '24')).toBe('السبت · الأحد الساعة 20:00');
});

test('days at different times read one group per time', () => {
  const next = ['2026-11-01T17:00:00.000Z', '2026-11-03T15:00:00.000Z'];
  expect(weeklyLine({ next }, '24')).toBe(`الأحد الساعة 20:00${t.common.listSeparator}الثلاثاء الساعة 18:00`);
});

test('the student line reads the STUDENT\'s zone: an imported rule (Riyadh) for a Cairo student shows Cairo', () => {
  expect(weeklySlot.tz).toBe('Asia/Riyadh');
  expect(studentLine(weeklySlot, 'Africa/Cairo', '24')).toBe(CAIRO);
  expect(studentLine(weeklySlot, 'Africa/Cairo', '12')).toBe('عند الطالب: الأحد · الثلاثاء · الخميس الساعة 7:00 م بتوقيت القاهرة');
  // A late Riyadh slot is the next day in a zone behind it.
  expect(studentLine({ next: ['2026-11-01T21:30:00.000Z'] }, 'Europe/London', '24')).toMatch(/^عند الطالب: الأحد الساعة 21:30/);
  expect(weeklyLine({ next: ['2026-11-01T21:30:00.000Z'] }, '24')).toBe(s.weekly.replace('{days}', 'الاثنين').replace('{time}', '00:30'));
});

test.each(['Asia/Riyadh', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain'])('%s reads Riyadh\'s days and clock: no student line, no zone label', (tz) => {
  expect(studentLine(weeklySlot, tz, '24')).toBeNull();
  expect(slotLines(weeklySlot, tz, '24')).toEqual({ main: 'الأحد · الثلاثاء · الخميس الساعة 20:00', student: null });
});

test('with a student line under it, the viewer line says «بتوقيتك»', () => {
  const main = `الأحد · الثلاثاء · الخميس الساعة 20:00 ${t.schedule.viewerTime}`;
  expect(slotLines(weeklySlot, 'Africa/Cairo', '24')).toEqual({ main, student: CAIRO });
});

test('teacher and length; no teacher leaves the length alone', () => {
  expect(slotMeta(weeklySlot)).toBe('مع أبرار محمد · 45 دقيقة');
  expect(slotMeta({ teacher: null, duration_min: 45 })).toBe('45 دقيقة');
});
