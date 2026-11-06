import { describe, expect, it } from 'vitest';
import { endOfLocalDay, parseLegacyPath, pickPairLesson } from './legacy-path';

const ID = '0b9f3c2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';

describe('parseLegacyPath (GET /report-link/legacy/*)', () => {
  it('(a) teacher/report/<lessonId>: our v2 button suffix', () => {
    expect(parseLegacyPath(`teacher/report/${ID}`)).toEqual({ kind: 'lesson', lessonId: ID });
    expect(parseLegacyPath(`/teacher/report/${ID}?x=1`)).toEqual({ kind: 'lesson', lessonId: ID });
  });

  it('(b) <code>/<teacher>/<anything>: the old Apps Script, the name decoded', () => {
    const name = encodeURIComponent('أبرار محمد');
    expect(parseLegacyPath(`ab-0004/${name}/tok123`)).toEqual({
      kind: 'pair',
      code: 'AB-0004',
      teacherName: 'أبرار محمد',
    });
  });

  it('(c) anything else is not a known shape', () => {
    for (const path of [
      '',
      'teacher/report/not-a-uuid',
      `teacher/report/${ID}/extra`,
      'AB-0004/name',
      'XY-0004/name/tok',
      'AB-0004/%E0%A4%A/tok',
      `AB-0004/${'x'.repeat(500)}/tok`,
      'https://evil.example',
    ]) {
      expect(parseLegacyPath(path)).toBeNull();
    }
  });
});

describe('pickPairLesson', () => {
  const now = new Date('2026-11-06T15:00:00Z');
  const l = (id: string, starts_at: string) => ({ id, starts_at });

  it('the most recent lesson that started within the last 24 h', () => {
    const lessons = [
      l('old', '2026-11-05T16:00:00Z'),
      l('new', '2026-11-06T14:00:00Z'),
      l('next', '2026-11-06T17:00:00Z'),
    ];
    expect(pickPairLesson(lessons, now)?.id).toBe('new');
  });

  it('else the pair’s next lesson (the window already ends with the teacher’s day)', () => {
    const lessons = [l('late', '2026-11-06T19:00:00Z'), l('next', '2026-11-06T17:00:00Z')];
    expect(pickPairLesson(lessons, now)?.id).toBe('next');
  });

  it('none: nothing started in the last 24 h and nothing later', () => {
    expect(pickPairLesson([l('stale', '2026-11-05T14:59:00Z')], now)).toBeNull();
    expect(pickPairLesson([], now)).toBeNull();
  });

  it('the teacher’s day ends at their local midnight', () => {
    expect(endOfLocalDay(now, 'Asia/Riyadh').toISOString()).toBe('2026-11-06T21:00:00.000Z');
  });
});
