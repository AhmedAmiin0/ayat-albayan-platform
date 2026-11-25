import { expect, test } from 'vitest';
import { closedSteps } from './closed-steps';

const states = (reason: Parameters<typeof closedSteps>[0]) =>
  closedSteps(reason).map((s) => `${s.key}:${s.state}`);

test('not subscribed: the subscription is the current step', () => {
  expect(states('not_subscribed')).toEqual([
    'subscribe:current',
    'teacher:pending',
    'open:pending',
  ]);
});

test('no teacher yet: subscribed, the teacher is the current step', () => {
  expect(states('no_teacher')).toEqual(['subscribe:done', 'teacher:current', 'open:pending']);
});

test('the chat switched off for the family: no steps (the title only)', () => {
  expect(closedSteps('family_chat_off')).toEqual([]);
});
