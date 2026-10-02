import { describe, expect, it } from 'vitest';
import { PHONE, threadRow } from './inbox.fakes';
import { forTeacher, teacherPeople } from './teacher-threads';
import { toThreadView } from './threads.mapper';

const NOW = new Date('2026-10-02T09:00:00Z');
const kid = (id: string, code: string | null = 'AB-0101') =>
  ({ id, code, name: id, status: 'active' as const, teacher: { display_name_ar: 'أبرار' } });

describe('forTeacher (teacher mode thread)', () => {
  it('clears the lead and the money tags and shows my unread, not the admin’s', () => {
    const view = toThreadView(threadRow({ unread_count: 5, guardian_id: 'g1' }), NOW, { badge: 'subscribed', unpaid: true });
    expect(view).toMatchObject({ subscribed: true, badge: 'subscribed', unpaid: true });
    expect(forTeacher(view, new Map([[PHONE, 2]]))).toMatchObject({
      ...{ lead_id: null, lead_name: null, lead_status: null, lead_source: null, badge: null, unpaid: false },
      ...{ subscribed: false, unread_count: 2, display_name: 'أم ياسمين', phone_e164: PHONE, guardian_id: 'g1' },
    });
    expect(forTeacher(view, new Map()).unread_count).toBe(0);
  });
});

describe('teacherPeople', () => {
  it('only my children of the guardian, never a package', () => {
    const row = threadRow({ guardian_id: 'g1', guardian_name: 'أم ياسمين' });
    const people = teacherPeople({ row, students: [kid('s1'), kid('s2', null)], mine: new Set(['s2']) });
    expect(people).toEqual({
      guardian: { id: 'g1', name: 'أم ياسمين' },
      lead: null,
      students: [{ id: 's2', name: 's2', code: '', teacher_name: 'أبرار', status: 'active', subscription: null }],
    });
  });

  it('no guardian (my own chat, an unknown number) → no one', () => {
    expect(teacherPeople({ row: threadRow(), students: [kid('s1')], mine: new Set(['s1']) })).toEqual({
      guardian: null,
      lead: null,
      students: [],
    });
    expect(teacherPeople({ row: null, students: [], mine: new Set() }).guardian).toBeNull();
  });
});
