import { t } from '@/lib/i18n';
import { ltr } from '@/ui/Ltr';
import { jana, lesson, muscat, pending, yusuf } from './fixtures';
import { durationLabel, lessonSubtitle, riyadhTime, studentNames, studentTimes } from './lesson-text';

test('the spine time is the start in Riyadh, 24h, Western digits', () => {
  expect(riyadhTime('2026-10-01T13:00:00.000Z')).toBe('16:00');
  expect(riyadhTime('2026-10-01T21:30:00.000Z')).toBe('00:30');
});

test('duration comes from the lesson span and reuses the enum wording', () => {
  expect(durationLabel(pending)).toBe(t.enums.duration['45']);
  expect(durationLabel(muscat)).toBe(t.enums.duration['60']);
  const odd = lesson({ id: 'x', ends_at: '2026-10-01T13:20:00.000Z' });
  expect(durationLabel(odd)).toBeUndefined();
});

test('a student in Riyadh adds no second clock; one abroad adds theirs with the city', () => {
  expect(studentTimes(pending)).toEqual([]);
  // 14:00Z = 17:00 Riyadh = 18:00 Muscat.
  expect(studentTimes(muscat)).toEqual(['18:00 بتوقيت مسقط']);
});

test('a group shows each other zone once; a zone without a city label shows its id', () => {
  const tokyo = { ...yusuf, id: 's9', tz: 'Asia/Tokyo' };
  const group = lesson({ id: 'g', students: [yusuf, jana, { ...jana, id: 's8' }, tokyo] });
  expect(studentTimes(group)).toEqual([
    '17:00 بتوقيت مسقط',
    t.today.studentTime.replace('{time}', '22:00').replace('{city}', ltr('Asia/Tokyo')),
  ]);
});

test('subtitle: teacher, duration, then the student clocks', () => {
  expect(lessonSubtitle(pending)).toBe('مع أبرار · 45 دقيقة');
  expect(lessonSubtitle(muscat)).toBe(`مع أبرار · ${t.enums.duration['60']} · 18:00 بتوقيت مسقط`);
  const odd = lesson({ id: 'x', ends_at: '2026-10-01T13:20:00.000Z' });
  expect(lessonSubtitle(odd)).toBe('مع أبرار');
});

test('names of every student on the lesson', () => {
  expect(studentNames(lesson({ id: 'g', students: [yusuf, jana] }))).toBe('يوسف أحمد، جنى وليد');
});
