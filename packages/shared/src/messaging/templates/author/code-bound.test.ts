import { describe, expect, it } from 'vitest';
import { codeBoundProblem, isCodeBound } from './code-bound.js';

const link = { type: 'url', url: 'https://meet.google.com/{{1}}' };
const reply = { type: 'quick_reply' };

describe('code-bound templates', () => {
  it('covers the producers, the sign-in code, the rating and the CRM alert', () => {
    for (const key of ['lesson_reminder', 'booking_confirmation', 'teacher_lesson_v3', 'report_ready',
      'renewal_due', 'lesson_join_link', 'lesson_feedback_request', 'account_code', 'lesson_rating',
      'teacher_lesson_v2']) expect([key, isCodeBound(key)]).toEqual([key, true]);
    expect(isCodeBound('free_trial_invite')).toBe(false);
    expect(isCodeBound('summer_offer')).toBe(false);
  });

  it('allows new words with the same variables and buttons', () => {
    const shape = { params: 2, buttons: [link, reply] };
    expect(codeBoundProblem(shape, { params: 2, buttons: [{ ...link }, { ...reply }] })).toBeNull();
  });

  it('refuses another number of variables', () => {
    expect(codeBoundProblem({ params: 2, buttons: [] }, { params: 3, buttons: [] })).toBe('code_bound_variables');
    expect(codeBoundProblem({ params: 2, buttons: [] }, { params: 1, buttons: [] })).toBe('code_bound_variables');
  });

  it('refuses a button added, removed, retyped, reordered or relinked', () => {
    const before = { params: 1, buttons: [link, reply] };
    const cases = [
      [link, reply, reply],
      [link],
      [reply, link],
      [reply, reply],
      [{ type: 'url', url: 'https://example.org/{{1}}' }, reply],
    ];
    for (const buttons of cases) expect(codeBoundProblem(before, { params: 1, buttons })).toBe('code_bound_buttons');
  });
});
