import { describe, expect, it } from 'vitest';
import { familyReaders, familyTargets, type FamilyStudent } from './family-readers';

const RIYADH = 'Asia/Riyadh';
const student = (id: string, over: Partial<FamilyStudent> = {}): FamilyStudent => ({
  id,
  name: `طالب ${id}`,
  tz: RIYADH,
  profile_id: null,
  guardian: { profile_id: 'g1', tz: 'Africa/Cairo' },
  ...over,
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

describe('familyTargets', () => {
  it("one target per login, with the event data and the reader's student", () => {
    const event = { kind: 'lesson_live' as const, subject: 'lesson:l1', data: { lessonId: 'l1' } };
    const at = '2026-11-14T16:00:00Z';
    const [target] = familyTargets(event, { at, students: [student('s1')] });
    expect(target).toMatchObject({
      kind: 'lesson_live',
      subject: 'lesson:l1',
      data: { lessonId: 'l1', studentId: 's1' },
      profileIds: ['g1'],
      vars: { student: 'طالب s1' },
    });
  });
});
