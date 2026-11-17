import { describe, expect, it } from 'vitest';
import type { PresenceRow } from './room-inside.repo';
import { presenceRole, roomStateOf } from './room-state.mapper';

const row = (over: Partial<PresenceRow> = {}): PresenceRow => ({
  lesson_id: 'l1',
  name: 'سارة',
  role: 'guest',
  entered_at: '2026-11-16T10:05:00.000Z',
  link: { student_id: 's1' },
  ...over,
});

describe('presenceRole', () => {
  it('names staff by what they are to the family', () => {
    expect(presenceRole(row({ role: 'teacher' }))).toBe('teacher');
    expect(['admin', 'assistant', 'sales'].map((role) => presenceRole(row({ role })))).toEqual([
      'staff',
      'staff',
      'staff',
    ]);
  });

  it("a guest by a student's link is the student; by a bare link a guest", () => {
    expect(presenceRole(row())).toBe('student');
    expect(presenceRole(row({ link: { student_id: null } }))).toBe('guest');
    expect(presenceRole(row({ link: null }))).toBe('guest');
  });
});

describe('roomStateOf', () => {
  it('nobody inside and not ended: no live state', () => {
    expect(roomStateOf({ endedAt: null, inside: [] })).toBeNull();
  });

  it('live since the earliest arrival; two windows of one person are one entry', () => {
    const inside = [
      row({ role: 'teacher', name: 'أ. مريم', entered_at: '2026-11-16T10:00:00.000Z', link: null }),
      row(),
      row({ entered_at: '2026-11-16T10:07:00.000Z' }),
    ];
    expect(roomStateOf({ endedAt: null, inside })).toEqual({
      liveSince: '2026-11-16T10:00:00.000Z',
      endedAt: null,
      inRoom: [
        { name: 'أ. مريم', role: 'teacher' },
        { name: 'سارة', role: 'student' },
      ],
    });
  });

  it('ended for everyone: nobody counts as inside', () => {
    expect(roomStateOf({ endedAt: '2026-11-16T10:30:00.000Z', inside: [row()] })).toEqual({
      liveSince: null,
      endedAt: '2026-11-16T10:30:00.000Z',
      inRoom: [],
    });
  });
});
