import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { classroomKeys } from './classroom.keys';

describe('classroom keys', () => {
  it('keeps the key shapes the join pages already cache under', () => {
    expect(classroomKeys.join('l1', 2)).toEqual(['classroom', 'join', 'l1', 2]);
    expect(classroomKeys.joins('l1')).toEqual(['classroom', 'join', 'l1']);
    expect(classroomKeys.staffLink('k', 'u1')).toEqual(['staff-link', 'k', 'u1']);
    expect(classroomKeys.studentLink('tok')).toEqual(['studentLink', 'tok']);
  });

  it('reaches every join attempt of one lesson and no other lesson', async () => {
    const attempts = [classroomKeys.join('l1', 0), classroomKeys.join('l1', 1)];
    const other = classroomKeys.join('l2', 0);
    expect(await staleAfter([...attempts, other], classroomKeys.joins('l1'))).toEqual(attempts);
  });
});
