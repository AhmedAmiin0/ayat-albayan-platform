import { describe, expect, it } from 'vitest';
import { STUDENT_STATUSES, type StudentStatus } from '@ab/catalog';
import { isCurrentStudent } from './student-lists.js';
import { boardStudents } from './board-students.js';

const all = STUDENT_STATUSES.map((status: StudentStatus) => ({ id: status, status }));
const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe('isCurrentStudent (docs/46 D4)', () => {
  it.each(STUDENT_STATUSES)('%s', (status) => {
    expect(isCurrentStudent(status)).toBe(status !== 'paused' && status !== 'churned');
  });
});

describe('boardStudents', () => {
  it('all: every current student, order kept, never paused or churned', () => {
    expect(ids(boardStudents(all, 'all'))).toEqual([
      'new', 'trial', 'pending_subscription', 'active', 'pending_renewal', 'expired',
    ]);
  });

  it('trial: not subscribed yet', () => {
    expect(ids(boardStudents(all, 'trial'))).toEqual(['new', 'trial', 'pending_subscription']);
  });

  it('active: subscribed', () => {
    expect(ids(boardStudents(all, 'active'))).toEqual(['active']);
  });
});
