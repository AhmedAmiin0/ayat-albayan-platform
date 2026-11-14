import { joinWindowConfig } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  familyReaders,
  lessonStartingPushes,
  reportSentPushes,
  windowJustOpened,
  type FamilyStudent,
} from './family-push.plan';

const WIN = joinWindowConfig({ join_opens_before_min: 15, join_closes_after_min: 120 });
const NOW = new Date('2026-11-14T16:00:00Z');
const RIYADH = 'Asia/Riyadh';
const min = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();
const lesson = (startMin: number, room: string | null = null) => ({
  starts_at: min(startMin),
  ends_at: min(startMin + 30),
  room_opened_at: room,
});
const student = (id: string, over: Partial<FamilyStudent> = {}): FamilyStudent => ({
  id,
  name: `طالب ${id}`,
  tz: RIYADH,
  profile_id: null,
  guardian: { profile_id: 'g1', tz: 'Africa/Cairo' },
  ...over,
});

describe('windowJustOpened (join_opens_before_min, joinWindow)', () => {
  it('open from opensBeforeMin before the start until 15 minutes after it', () => {
    expect(windowJustOpened(lesson(16), NOW, WIN)).toBe(false);
    expect(windowJustOpened(lesson(15), NOW, WIN)).toBe(true);
    expect(windowJustOpened(lesson(0), NOW, WIN)).toBe(true);
    expect(windowJustOpened(lesson(-15), NOW, WIN)).toBe(true);
    expect(windowJustOpened(lesson(-16), NOW, WIN)).toBe(false);
  });

  it('a room the staff opened early opens the window early', () => {
    expect(windowJustOpened(lesson(40, min(-1)), NOW, WIN)).toBe(true);
    expect(windowJustOpened(lesson(40, min(5)), NOW, WIN)).toBe(false);
  });
});

describe('familyReaders', () => {
  it('the guardian and the student’s own login, each in their own zone', () => {
    const readers = familyReaders([student('s1', { profile_id: 'p1' })]);
    expect(readers).toEqual([
      { profileId: 'g1', tz: 'Africa/Cairo', names: ['طالب s1'], studentId: 's1' },
      { profileId: 'p1', tz: RIYADH, names: ['طالب s1'], studentId: 's1' },
    ]);
  });

  it('siblings in one lesson: one reader for their guardian naming both', () => {
    const readers = familyReaders([student('s1'), student('s2')]);
    expect(readers).toEqual([
      expect.objectContaining({ profileId: 'g1', names: ['طالب s1', 'طالب s2'] }),
    ]);
  });

  it('an adult who is their own guardian (one login) is told once; no login, nobody', () => {
    const self = student('s1', { profile_id: 'g1' });
    expect(familyReaders([self])).toEqual([
      expect.objectContaining({ profileId: 'g1', names: ['طالب s1'] }),
    ]);
    expect(familyReaders([student('s2', { guardian: { profile_id: null, tz: RIYADH } })])).toEqual(
      [],
    );
    expect(familyReaders([student('s3', { guardian: null })])).toEqual([]);
  });
});

describe('the push targets', () => {
  it('lesson_starting: per login, keyed by the lesson, with lessonId and studentId', () => {
    const pushes = lessonStartingPushes({
      id: 'l1',
      ...lesson(10),
      students: [student('s1', { profile_id: 'p1' })],
    });
    expect(pushes.map((p) => [p.kind, p.subject, p.profileIds])).toEqual([
      ['lesson_starting', 'lesson:l1', ['g1']],
      ['lesson_starting', 'lesson:l1', ['p1']],
    ]);
    expect(pushes[0]?.data).toEqual({ lessonId: 'l1', studentId: 's1' });
    expect(pushes[0]?.vars.student).toBe('طالب s1');
    expect(pushes[0]?.vars.when).not.toBe(pushes[1]?.vars.when);
  });

  it('report_sent: keyed by the report, naming the lesson’s time', () => {
    const report = { id: 'r1', lesson_id: 'l1', starts_at: min(-60), student: student('s1') };
    const [push] = reportSentPushes(report);
    expect(push).toMatchObject({ kind: 'report_sent', subject: 'report:r1', profileIds: ['g1'] });
    expect(push?.data).toEqual({ reportId: 'r1', lessonId: 'l1', studentId: 's1' });
  });
});
