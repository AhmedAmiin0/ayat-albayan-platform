import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { SalesCourseRepo } from './sales-course.repo';

// PR #642 review: only a weekly course with no package makes a student «imported».
const SUB = { id: 'sub1', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-10' };
const TWO = [{ ...SUB, rules: [{ id: 'r1' }] }, { ...SUB, id: 'sub0', rules: [] }];
const trial = { starts_on: '2026-10-01', ends_on: '2026-10-01', package: 'trial' };
const makeup = { starts_on: '2026-10-05', ends_on: '2026-10-05', package: '8' };

describe('SalesCourseRepo.subscription (imported)', () => {
  it('a trial and a makeup without a package: the older unbooked package is booked', async () => {
    const t = fakeDb({
      subscriptions: [{ data: TWO }],
      schedule_rule_students: [{ data: [{ rule: trial }, { rule: makeup }] }],
    });
    expect(await new SalesCourseRepo(t.db).subscription('s1')).toEqual({ ...SUB, id: 'sub0' });
    expect(t.argsOf('schedule_rule_students', 'is')).toEqual(['rule.subscription_id', null]);
  });

  it('an imported weekly course (paused or ended too): the newest package only', async () => {
    const weekly = { starts_on: '2026-01-01', ends_on: null, package: null };
    const t = fakeDb({
      subscriptions: [{ data: TWO }],
      schedule_rule_students: [{ data: [{ rule: trial }, { rule: weekly }] }],
    });
    expect(await new SalesCourseRepo(t.db).subscription('s1')).toEqual(SUB);
  });
});
