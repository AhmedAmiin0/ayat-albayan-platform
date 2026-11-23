import { describe, expect, it } from 'vitest';
import { alertLink } from './alert-link';

const GUARDIAN = { kind: 'guardian', chatOn: false } as const;
const STUDENT = { kind: 'student', chatOn: false } as const;

describe('alertLink: where a bell row opens on the family pages', () => {
  it('a report opens its own page with whose it is', () => {
    expect(alertLink({ screen: 'report', studentId: 's1', reportId: 'r1' }, GUARDIAN)).toEqual({
      to: '/report/$reportId',
      params: { reportId: 'r1' },
      search: { studentId: 's1' },
    });
  });

  it('a child (or the package) is a guardian’s child page, a student’s own home', () => {
    expect(alertLink({ screen: 'package', studentId: 's1' }, GUARDIAN)).toEqual({
      to: '/children/$studentId',
      params: { studentId: 's1' },
      search: { tab: 'package' },
    });
    expect(alertLink({ screen: 'child', studentId: 's1' }, STUDENT)).toEqual({
      to: '/portal',
      search: { tab: undefined },
    });
  });

  it('a live lesson, or a chat message while the chat is off, opens «القادمة»', () => {
    expect(alertLink({ screen: 'live', studentId: 's1', lessonId: 'l1' }, GUARDIAN)).toEqual({
      to: '/children/$studentId',
      params: { studentId: 's1' },
      search: { tab: undefined },
    });
    expect(alertLink({ screen: 'chat', studentId: 's1' }, STUDENT)).toEqual({
      to: '/portal',
      search: { tab: undefined },
    });
  });

  it('a chat message while family_chat_enabled is on opens the child’s «المحادثة»', () => {
    const on = { chatOn: true } as const;
    expect(alertLink({ screen: 'chat', studentId: 's1' }, { ...GUARDIAN, ...on })).toEqual({
      to: '/children/$studentId',
      params: { studentId: 's1' },
      search: { tab: 'chat' },
    });
    expect(alertLink({ screen: 'chat', studentId: 's1' }, { ...STUDENT, ...on })).toEqual({
      to: '/portal',
      search: { tab: 'chat' },
    });
  });

  it('no child named: the week', () => {
    expect(alertLink({ screen: 'schedule' }, STUDENT)).toEqual({ to: '/schedule' });
  });
});
