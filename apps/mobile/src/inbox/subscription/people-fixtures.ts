import type { ThreadPeople, ThreadStudentView, ThreadSubscriptionView } from '@ab/shared';

// Invented GET /threads/:phone `people` rows for the chat's subscription tests (no real people).

export const CHILD_ID = '44444444-4444-4444-8444-444444444444';

/** An 8-lesson package with 2 left and nothing paid yet. */
export function sub(fields: Partial<ThreadSubscriptionView> = {}): ThreadSubscriptionView {
  return {
    id: 'sub-1',
    status: 'active',
    package_size: '8',
    lessons_total: 8,
    lessons_used: 6,
    lessons_remaining: 2,
    price: 120,
    currency: 'SAR',
    paid_amount: 0,
    due_amount: 120,
    renews_on: null,
    starts_on: '2026-09-20',
    ...fields,
  };
}

export const usedUp = sub({
  status: 'expired',
  lessons_used: 8,
  lessons_remaining: 0,
  due_amount: 0,
});

export function child(fields: Partial<ThreadStudentView> = {}): ThreadStudentView {
  return {
    id: CHILD_ID,
    name: 'يوسف',
    code: 'AB-0183',
    teacher_name: 'مريم المعلمة',
    status: 'active',
    subscription: sub(),
    ...fields,
  };
}

export const family = (students: ThreadStudentView[]): ThreadPeople => ({
  guardian: { id: 'g-1', name: 'أم يوسف' },
  lead: null,
  students,
});

export const leadOnly: ThreadPeople = {
  guardian: null,
  lead: { id: 'a1', status: 'new' },
  students: [],
};
