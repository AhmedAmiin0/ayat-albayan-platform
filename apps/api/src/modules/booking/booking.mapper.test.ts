import { describe, expect, it } from 'vitest';
import { leadTarget, lessonRows, meetingLinkFor, toBookingResult } from './booking.mapper';

const TEACHER = 'https://meet.jit.si/ab-abrar';
const OWN = 'https://meet.google.com/abc-defg-hij';

describe('meetingLinkFor (R-LES-01, docs/10 invariant 3)', () => {
  it('the link typed in the wizard wins', () => {
    expect(meetingLinkFor({ requested: 'https://x.test/r', overrides: [OWN], teacherLink: TEACHER })).toBe(
      'https://x.test/r',
    );
  });

  it("a single student's own link beats the teacher's", () => {
    expect(meetingLinkFor({ overrides: [OWN], teacherLink: TEACHER })).toBe(OWN);
  });

  it("groups skip the students' own links", () => {
    expect(meetingLinkFor({ overrides: [OWN, null], teacherLink: TEACHER })).toBe(TEACHER);
  });

  it("falls back to the teacher's link, or none", () => {
    expect(meetingLinkFor({ requested: null, overrides: [null], teacherLink: TEACHER })).toBe(TEACHER);
    expect(meetingLinkFor({ overrides: [undefined], teacherLink: null })).toBeNull();
  });
});

describe('leadTarget (R-LEAD-06)', () => {
  it('a trial moves a new or contacted lead to trial_booked', () => {
    expect(leadTarget('new', 'trial')).toBe('trial_booked');
    expect(leadTarget('contacted', 'trial')).toBe('trial_booked');
  });

  it('a paid package converts a lead after its trial', () => {
    expect(leadTarget('trial_done', '8')).toBe('converted');
  });

  it('leaves the lead alone when the funnel does not allow the move', () => {
    expect(leadTarget('new', '12')).toBeNull();
    expect(leadTarget('trial_booked', 'trial')).toBeNull();
    expect(leadTarget('converted', '8')).toBeNull();
  });
});

describe('lessonRows (R-SCH-04)', () => {
  const occ = (start: string, end: string) => ({ starts_at: new Date(start), ends_at: new Date(end) });
  const occurrences = [
    occ('2026-10-04T14:00:00Z', '2026-10-04T14:45:00Z'),
    occ('2026-10-11T14:00:00Z', '2026-10-11T14:45:00Z'),
  ];
  const clash = { kind: 'teacher_busy' as const, startsAt: '2026-10-11T14:00:00.000Z', endsAt: '2026-10-11T14:45:00.000Z' };

  const link = 'https://meet.jit.si/ab-abrar';

  it('stores the override reason only on the clashing occurrence; every lesson gets the link', () => {
    const rows = lessonRows({ occurrences, conflicts: [clash], reason: 'ولي الأمر طلب كده', meetingLink: link });
    expect(rows).toEqual([
      { starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z', meeting_link: link, override_reason: null },
      {
        starts_at: '2026-10-11T14:00:00.000Z',
        ends_at: '2026-10-11T14:45:00.000Z',
        meeting_link: link,
        override_reason: 'ولي الأمر طلب كده',
      },
    ]);
  });

  it('no conflicts → no reasons', () => {
    const rows = lessonRows({ occurrences, conflicts: [], reason: null, meetingLink: null });
    expect(rows.every((l) => l.override_reason === null && l.meeting_link === null)).toBe(true);
  });
});

describe('toBookingResult', () => {
  it('turns Postgres timestamps into UTC ISO instants', () => {
    const data = {
      rule_id: 'R1',
      student_ids: ['S1'],
      guardian_ids: ['G1'],
      lessons: [{ id: 'L1', starts_at: '2026-10-04T14:00:00+00:00', ends_at: '2026-10-04T17:45:00+03:00' }],
      message_ids: ['M1'],
    };
    expect(toBookingResult(data).lessons).toEqual([
      { id: 'L1', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' },
    ]);
  });

  it('throws on an unexpected shape instead of returning half a result', () => {
    expect(() => toBookingResult({ rule_id: 'R1' })).toThrow();
  });
});
