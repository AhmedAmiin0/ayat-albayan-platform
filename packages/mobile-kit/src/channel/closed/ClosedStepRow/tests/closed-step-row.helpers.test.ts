import { t } from '../../../../lib/i18n/i18n';
import { noteOf, stepLabel } from '../closed-step-row.helpers';

const c = t.studentChannel.closedCard;

test('a done step reads its name and done', () => {
  expect(noteOf({ key: 'subscribe', state: 'done' })).toBe(c.done);
  expect(stepLabel({ key: 'subscribe', state: 'done' })).toBe(`${c.steps.subscribe}، ${c.done}`);
});

test('the current step says so between its name and its note', () => {
  const step = { key: 'teacher', state: 'current' } as const;
  expect(stepLabel(step)).toBe(`${c.steps.teacher}، ${c.current}، ${c.notes.teacher}`);
});

test('a step to come reads its name and its note only', () => {
  expect(stepLabel({ key: 'open', state: 'pending' })).toBe(`${c.steps.open}، ${c.notes.open}`);
});
