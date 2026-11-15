import { stepsFor } from './steps';

test('a trial is free: no package step, no invoice step', () => {
  expect(stepsFor('trial')).toEqual(['contact', 'teacher', 'slot', 'confirm']);
});

test('a package asks for the invoice after the slot, before the review', () => {
  expect(stepsFor('package')).toEqual([
    'contact',
    'teacher',
    'package',
    'slot',
    'invoice',
    'confirm',
  ]);
});

test('a makeup starts at the teacher (the student is known) and needs the invoice', () => {
  expect(stepsFor('makeup')).toEqual(['teacher', 'slot', 'invoice', 'confirm']);
});
