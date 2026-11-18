import { describe, expect, it } from 'vitest';
import { alertLink } from './alert-link';

describe('alertLink: where a bell row opens on the family pages', () => {
  it('a report opens its own page with whose it is', () => {
    expect(alertLink({ screen: 'report', studentId: 's1', reportId: 'r1' }, 'guardian')).toEqual({
      to: '/report/$reportId',
      params: { reportId: 'r1' },
      search: { studentId: 's1' },
    });
  });

  it('a child (or the package) is a guardian’s child page, a student’s own home', () => {
    expect(alertLink({ screen: 'package', studentId: 's1' }, 'guardian')).toEqual({
      to: '/children/$studentId',
      params: { studentId: 's1' },
      search: { tab: 'package' },
    });
    expect(alertLink({ screen: 'child', studentId: 's1' }, 'student')).toEqual({
      to: '/portal',
      search: { tab: undefined },
    });
  });

  it('a live lesson or a chat message opens the child’s page («القادمة»)', () => {
    expect(alertLink({ screen: 'live', studentId: 's1', lessonId: 'l1' }, 'guardian')).toEqual({
      to: '/children/$studentId',
      params: { studentId: 's1' },
      search: { tab: undefined },
    });
    expect(alertLink({ screen: 'chat', studentId: 's1' }, 'student')).toEqual({
      to: '/portal',
      search: { tab: undefined },
    });
  });

  it('no child named: the week', () => {
    expect(alertLink({ screen: 'schedule' }, 'student')).toEqual({ to: '/schedule' });
  });
});
