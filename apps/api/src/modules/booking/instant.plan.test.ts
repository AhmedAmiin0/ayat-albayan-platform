import { describe, expect, it } from 'vitest';
import { ruleOccurrences } from '../scheduling/occurrences';
import { instantPayload, instantPlan } from './instant.plan';

const now = new Date('2026-10-05T13:07:42.512Z'); // a Monday; 16:07 in Riyadh, 15:07 in Cairo

describe('instantPlan', () => {
  it('starts this minute (rounded down) and lasts the chosen duration', () => {
    const { occurrence } = instantPlan({ now, tz: 'Asia/Riyadh', durationMin: 45 });
    expect(occurrence.starts_at.toISOString()).toBe('2026-10-05T13:07:00.000Z');
    expect(occurrence.ends_at.toISOString()).toBe('2026-10-05T13:52:00.000Z');
  });

  it('is a one-day rule on today, at this minute of the zone', () => {
    const { timing } = instantPlan({ now, tz: 'Asia/Riyadh', durationMin: 30 });
    expect(timing).toEqual({
      byday: [1],
      start_time_local: '16:07',
      duration_min: 30,
      tz: 'Asia/Riyadh',
      starts_on: '2026-10-05',
      ends_on: '2026-10-05',
    });
  });

  it('uses the local date, not the UTC one, near midnight', () => {
    const late = new Date('2026-10-05T22:30:00Z'); // 01:30 on the 6th (Tuesday) in Riyadh
    const { timing } = instantPlan({ now: late, tz: 'Asia/Riyadh', durationMin: 30 });
    expect(timing).toMatchObject({ starts_on: '2026-10-06', byday: [2], start_time_local: '01:30' });
  });

  it.each(['Asia/Riyadh', 'Africa/Cairo', 'America/New_York', 'Europe/London'])(
    'round-trips in %s: the generator would produce exactly this lesson',
    (tz) => {
      const plan = instantPlan({ now, tz, durationMin: 60 });
      const day = { from: new Date('2026-10-04T00:00:00Z'), to: new Date('2026-10-07T00:00:00Z') };
      expect(ruleOccurrences(plan.timing, day)).toEqual([plan.occurrence]);
    },
  );
});

describe('instantPayload', () => {
  const plan = instantPlan({ now, tz: 'Asia/Riyadh', durationMin: 30 });
  const base = {
    plan,
    teacherId: 'T1',
    studentIds: ['S1', 'S2'],
    conflicts: [],
    reason: null,
    meetingLink: 'https://meet.example.test/x',
    clientRequestId: null,
  };

  it('has no package, lead, invoice, makeup or messages (nothing goes to WhatsApp)', () => {
    const p = instantPayload(base);
    expect(p).toMatchObject({ lead: null, new_guardian: null, new_student: null, invoice: null, makeup_of: null, messages: [] });
    expect(p.rule).toMatchObject({ package: null, teacher_id: 'T1', meeting_link: null, ends_on: '2026-10-05' });
    expect(p.student_ids).toEqual(['S1', 'S2']);
    expect(p.audit.after).toMatchObject({ kind: 'instant' });
  });

  it('writes the one lesson, with the override reason on a clashing start', () => {
    const conflicts = [{ kind: 'teacher_busy' as const, startsAt: '2026-10-05T13:07:00.000Z', endsAt: '2026-10-05T13:37:00.000Z' }];
    const p = instantPayload({ ...base, conflicts, reason: 'طارئ' });
    expect(p.lessons).toEqual([
      {
        starts_at: '2026-10-05T13:07:00.000Z',
        ends_at: '2026-10-05T13:37:00.000Z',
        meeting_link: 'https://meet.example.test/x',
        override_reason: 'طارئ',
      },
    ]);
  });
});
