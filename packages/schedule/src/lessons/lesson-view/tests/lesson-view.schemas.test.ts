import { describe, expect, it } from 'vitest';
import { lessonViewSchema } from '../lesson-view.schemas';

const lessonId = '00000000-0000-4000-8000-000000000001';
const student = {
  id: '00000000-0000-4000-8000-000000000002',
  code: 'AB-0001',
  name: 'Student',
  tz: 'Africa/Cairo',
  attendance: null,
  chargeable: true,
  seq: null,
};
const view = {
  id: lessonId,
  rule_id: null,
  teacher: { id: '00000000-0000-4000-8000-000000000003', display_name_ar: 'T', tz: 'Asia/Riyadh' },
  starts_at: '2026-11-27T10:00:00.000Z',
  ends_at: '2026-11-27T10:30:00.000Z',
  status: 'scheduled',
  meeting_link: null,
  cancel_reason: null,
  override_reason: null,
  confirmed_at: null,
  rescheduled_from_id: null,
  students: [student],
  allowed_events: ['confirm', 'cancel'],
  conflicts: [],
  pending_proposal: null,
};
const parses = (value: unknown): boolean => lessonViewSchema.safeParse(value).success;

describe('lessonViewSchema', () => {
  it('keeps a lesson with only its required fields as it is', () => {
    expect(lessonViewSchema.parse(view)).toEqual(view);
  });

  it('keeps every optional part the api adds', () => {
    const full = {
      ...view,
      rule_byday: [0, 3],
      trial: false,
      course_subscription_id: null,
      makeup: true,
      makeup_of: { id: lessonId, starts_at: view.starts_at },
      teacher: { ...view.teacher, display_name_en: null, avatar_url: 'https://x.test/a.png' },
      auto_held: true,
      platform_classroom: true,
      teacher_confirmed_at: null,
      room_opened_at: null,
      room: { liveSince: null, endedAt: null, inRoom: [{ role: 'teacher' }] },
      instant: false,
      time_edit_mode: 'move',
      time_edit: { at: view.starts_at, reason: null, was: { starts_at: '1', ends_at: '2' } },
      pending_proposal: {
        id: lessonId,
        proposed_starts_at: view.starts_at,
        note: null,
        created_at: view.starts_at,
        requested_by: 'family',
      },
      conflicts: [{ kind: 'teacher_busy', startsAt: '1', endsAt: '2', lessonId }],
      students: [
        {
          ...student,
          unpaid: true,
          makeup: { lesson_id: lessonId, starts_at: view.starts_at },
          report: { id: lessonId, status: 'submitted', can_edit: false, edit_until: null },
        },
      ],
    };
    expect(lessonViewSchema.parse(full)).toEqual(full);
  });

  it('keeps the blank code, name and zone of a student row the api could not read', () => {
    expect(parses({ ...view, students: [{ ...student, code: '', name: '', tz: '' }] })).toBe(true);
  });

  it('refuses an unknown status, event, conflict kind, time edit mode or requester', () => {
    expect(parses({ ...view, status: 'done' })).toBe(false);
    expect(parses({ ...view, allowed_events: ['fly'] })).toBe(false);
    expect(parses({ ...view, conflicts: [{ kind: 'busy', startsAt: '1', endsAt: '2' }] })).toBe(
      false,
    );
    expect(parses({ ...view, time_edit_mode: 'stretch' })).toBe(false);
    const proposal = { id: lessonId, proposed_starts_at: '1', note: null, created_at: '1' };
    expect(parses({ ...view, pending_proposal: { ...proposal, requested_by: 'admin' } })).toBe(
      false,
    );
  });

  it('refuses a lesson id that is not a uuid and a missing student list', () => {
    expect(parses({ ...view, id: 'l1' })).toBe(false);
    const { students: _students, ...withoutStudents } = view;
    expect(parses(withoutStudents)).toBe(false);
  });

  it('refuses a weekday outside Sunday to Saturday', () => {
    expect(parses({ ...view, rule_byday: [7] })).toBe(false);
  });
});
