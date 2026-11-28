import { describe, expect, it } from 'vitest';
import type { SalesScope } from '@/modules/sales/sales';
import type { TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { forwardedBy } from '@/modules/messaging/inbox/files/thread-forward.controller';

const SALES: Pick<SalesScope, 'salesId'> = { salesId: 's1' };
const TEACHER: Pick<TeacherScope, 'teacherId' | 'teacherName'> = { teacherId: 't1', teacherName: 'معلم' };

describe('forwardedBy (who the forward audit row names)', () => {
  it('a salesperson by her id', () => {
    expect(forwardedBy(SALES, null)).toEqual({ sales_id: 's1' });
  });

  it('a teacher by id and name', () => {
    expect(forwardedBy(null, TEACHER)).toEqual({ teacher_id: 't1', teacher_name: 'معلم' });
  });

  it('the admin: nobody beside the actor', () => {
    expect(forwardedBy(null, null)).toEqual({});
  });
});
