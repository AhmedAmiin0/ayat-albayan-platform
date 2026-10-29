import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { jana, lesson, muscat, pending, yusuf } from '../testing/fixtures';
import { durationLabel, lessonSubtitle, riyadhTime, rowSubtitle, studentNames, studentTimes } from './lesson-text';

test('the spine time is the start in Riyadh, 24h, Western digits', () => {
  expect(riyadhTime('2026-10-01T13:00:00.000Z', '24')).toBe('16:00');
  expect(riyadhTime('2026-10-01T21:30:00.000Z', '24')).toBe('00:30');
  expect(riyadhTime('2026-10-01T13:00:00.000Z', '12')).toBe('4:00 م');
  expect(riyadhTime('2026-10-01T21:30:00.000Z', '12')).toBe('12:30 ص');
});

test('duration comes from the lesson span and reuses the enum wording', () => {
  expect(durationLabel(pending)).toBe(t.enums.duration['45']);
  expect(durationLabel(muscat)).toBe(t.enums.duration['60']);
  const odd = lesson({ id: 'x', ends_at: '2026-10-01T13:20:00.000Z' });
  expect(durationLabel(odd)).toBeUndefined();
});

test('a student in Riyadh adds no second clock; one abroad adds theirs with the city', () => {
  expect(studentTimes(pending, '24')).toEqual([]);
  // 14:00Z = 17:00 Riyadh = 18:00 Muscat.
  expect(studentTimes(muscat, '24')).toEqual(['18:00 بتوقيت مسقط']);
});

test('a group shows each other zone once; a zone without a city label shows its id', () => {
  const tokyo = { ...yusuf, id: 's9', tz: 'Asia/Tokyo' };
  const group = lesson({ id: 'g', students: [yusuf, jana, { ...jana, id: 's8' }, tokyo] });
  expect(studentTimes(group, '24')).toEqual([
    '17:00 بتوقيت مسقط',
    t.today.studentTime.replace('{time}', '22:00').replace('{city}', ltr('Asia/Tokyo')),
  ]);
});

test('subtitle: teacher, duration, then the student clocks', () => {
  expect(lessonSubtitle(pending, '24')).toBe('مع أبرار · 45 دقيقة');
  expect(lessonSubtitle(muscat, '24')).toBe(`مع أبرار · ${t.enums.duration['60']} · 18:00 بتوقيت مسقط`);
  const odd = lesson({ id: 'x', ends_at: '2026-10-01T13:20:00.000Z' });
  expect(lessonSubtitle(odd, '24')).toBe('مع أبرار');
});

test('names of every student on the lesson', () => {
  expect(studentNames(lesson({ id: 'g', students: [yusuf, jana] }))).toBe('يوسف أحمد، جنى وليد');
});

test('a row line: trial or makeup first (a one-line cut never drops it), the titled teacher, the length', () => {
  expect(rowSubtitle(pending)).toBe(`أ. أبرار · ${t.enums.duration['45']}`);
  expect(rowSubtitle(lesson({ id: 'tr', trial: true }))).toBe(`${t.schedule.trialTag} · أ. أبرار · ${t.enums.duration['45']}`);
  expect(rowSubtitle(lesson({ id: 'mk', makeup: true, trial: true }))).toBe(
    `${t.booking.makeup.tag} · أ. أبرار · ${t.enums.duration['45']}`,
  );
});
