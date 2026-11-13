import { describe, expect, it } from 'vitest';
import type { LessonStatus } from '@ab/shared';
import { lessonPlan, teacherCanPropose, wayIn, type PlanInput } from './teacher-lesson-plan.js';

const base: PlanInput = {
  join: 'off',
  wayIn: 'room',
  open: true,
  canConfirm: false,
  canCancel: false,
  stage: null,
};
const plan = (o: Partial<PlanInput>) => lessonPlan({ ...base, ...o });

describe('lessonPlan lead order', () => {
  it('before the window: «سأحضر» leads, cancel is a peer', () => {
    expect(plan({ canConfirm: true, canCancel: true })).toEqual({
      lead: 'confirm',
      peers: ['cancel'],
    });
  });

  it('a live join beats confirm and a due report', () => {
    expect(plan({ join: 'live', canConfirm: true, stage: 'write' })).toEqual({
      lead: 'join',
      peers: ['confirm', 'report'],
    });
  });

  it('after ends_at the report leads and join is a peer', () => {
    expect(plan({ join: 'after', stage: 'write' })).toEqual({ lead: 'report', peers: ['join'] });
    expect(plan({ join: 'after', stage: 'resume' }).lead).toBe('report');
  });

  it('a report in its window or done never leads but stays a peer', () => {
    expect(plan({ stage: 'window' })).toEqual({ lead: null, peers: ['report'] });
    expect(plan({ stage: 'done' })).toEqual({ lead: null, peers: ['report'] });
    expect(plan({})).toEqual({ lead: null, peers: [] });
  });

  it('a fixed link leads only while live, else it stays one tap away on an open lesson', () => {
    expect(plan({ wayIn: 'link', join: 'live' }).lead).toBe('join');
    expect(plan({ wayIn: 'link', canConfirm: true })).toEqual({
      lead: 'confirm',
      peers: ['join'],
    });
    expect(plan({ wayIn: 'link', open: false, stage: 'done' }).peers).toEqual(['report']);
  });
});

describe('wayIn and teacherCanPropose', () => {
  it('her own link → link; none or platform → room', () => {
    expect(wayIn({ platform: false, ownLink: 'https://meet.example/x' })).toBe('link');
    expect(wayIn({ platform: false, ownLink: null })).toBe('room');
    expect(wayIn({ platform: false, ownLink: '' })).toBe('room');
    expect(wayIn({ platform: true, ownLink: 'https://meet.example/x' })).toBe('room');
  });

  type ProposeLesson = Parameters<typeof teacherCanPropose>[0];
  const proposal = { id: 'p1' } as NonNullable<ProposeLesson['pending_proposal']>;
  const lesson = (status: LessonStatus, pending: typeof proposal | null = null): ProposeLesson =>
    ({ status, pending_proposal: pending });

  it('open with no pending proposal only', () => {
    expect(teacherCanPropose(lesson('scheduled'))).toBe(true);
    expect(teacherCanPropose(lesson('scheduled', proposal))).toBe(false);
    expect(teacherCanPropose(lesson('cancelled_by_teacher'))).toBe(false);
  });
});
