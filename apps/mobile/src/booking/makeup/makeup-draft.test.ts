import { lesson, yusuf } from '@/today/testing/fixtures';
import { lengthOf, makeupDraft, makeupParams, sourceFromParams } from './makeup-draft';

const missed = lesson({ id: 'm1', status: 'no_show' });

test('the row hands the lesson over as route params and the screen reads them back', () => {
  const params = makeupParams(missed, yusuf);
  expect(params).toEqual({
    lessonId: 'm1',
    studentId: 's1',
    studentName: 'يوسف أحمد',
    tz: 'Asia/Riyadh',
    missedAt: '2026-10-01T13:00:00.000Z',
    durationMin: '45',
    teacherId: 't1',
    teacherName: 'أبرار',
  });
  const source = sourceFromParams(params);
  expect(source).toMatchObject({ lessonId: 'm1', studentId: 's1', durationMin: 45 });
  if (!source) throw new Error('params');
  expect(makeupDraft(source).teacher).toEqual({ id: 't1', name: 'أبرار' });
});

test('a link missing a fact, or with a length the slots API does not offer, is refused', () => {
  const params = makeupParams(missed, yusuf);
  expect(sourceFromParams({ ...params, studentId: undefined })).toBeNull();
  expect(sourceFromParams({ ...params, teacherName: '' })).toBeNull();
  expect(sourceFromParams({ ...params, tz: ['a', 'b'] })).toBeNull();
  expect(sourceFromParams({ ...params, durationMin: '50' })).toBeNull();
  expect(sourceFromParams({})).toBeNull();
});

test('the makeup keeps the original’s length when it is 30/45/60/90, else the form’s 45', () => {
  const span = (min: number) =>
    lesson({ id: 'x', ends_at: new Date(Date.parse(missed.starts_at) + min * 60_000).toISOString() });
  expect([30, 45, 60, 90].map((m) => lengthOf(span(m)))).toEqual([30, 45, 60, 90]);
  expect(lengthOf(span(50))).toBe(45);
});
