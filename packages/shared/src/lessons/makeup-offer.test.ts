import { describe, expect, it } from 'vitest';
import { makeupOffer } from './makeup-offer.js';
import type { LessonStudentView, LessonView } from './views.js';

const NOW = new Date('2026-10-03T10:00:00Z');
const student = (id: string, over: Partial<LessonStudentView> = {}): LessonStudentView => ({
  id,
  code: `AB-${id}`,
  name: id,
  tz: 'Africa/Cairo',
  attendance: null,
  chargeable: true,
  seq: null,
  ...over,
});
const lesson = (over: Partial<LessonView> = {}, students = [student('A')]) =>
  ({ status: 'no_show', starts_at: '2026-10-01T14:00:00.000Z', students, ...over }) as LessonView;
const ids = (l: { id: string }[]) => l.map((s) => s.id);

describe('makeupOffer (the makeup button, per student)', () => {
  it('a charged no-show inside 60 days is open for its student', () => {
    expect(ids(makeupOffer(lesson(), NOW).open)).toEqual(['A']);
  });

  it('a student whose makeup is booked moves to `booked`, with the makeup date', () => {
    const l = lesson({}, [student('A', { makeup: { lesson_id: 'M1', starts_at: '2026-10-04T14:00:00.000Z' } }), student('B')]);
    const offer = makeupOffer(l, NOW);
    expect(ids(offer.open)).toEqual(['B']);
    expect(offer.booked.map((s) => s.makeup.lesson_id)).toEqual(['M1']);
  });

  it.each([
    ['older than 60 days', { starts_at: '2026-07-01T14:00:00.000Z' }],
    ['a completed lesson', { status: 'completed' as const }],
    ['a trial', { trial: true }],
    ['itself a makeup', { makeup: true }],
    ['cancelled by the teacher', { status: 'cancelled_by_teacher' as const }],
  ])('%s offers nothing', (_name, over) => {
    expect(makeupOffer(lesson(over), NOW)).toEqual({ open: [], booked: [] });
  });

  it('a student the package did not charge offers nothing', () => {
    expect(makeupOffer(lesson({}, [student('A', { chargeable: false })]), NOW).open).toEqual([]);
  });
});
