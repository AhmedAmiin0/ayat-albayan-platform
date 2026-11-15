import { stepValue } from './step-value';

const hours = { min: 0, max: 23, step: 1, wrap: true };
const minutes = { min: 0, max: 45, step: 15, wrap: true };
const duration = { min: 15, max: 240, step: 15, wrap: false };

test('a clock wraps round: 23 → 0, 0 → 23, 45 → 0, 0 → 45', () => {
  expect(stepValue(23, 1, hours)).toBe(0);
  expect(stepValue(0, -1, hours)).toBe(23);
  expect(stepValue(14, 1, hours)).toBe(15);
  expect(stepValue(45, 1, minutes)).toBe(0);
  expect(stepValue(0, -1, minutes)).toBe(45);
  expect(stepValue(15, 1, minutes)).toBe(30);
});

test('a length stops at its edges (15..240 by 15)', () => {
  expect(stepValue(60, 1, duration)).toBe(75);
  expect(stepValue(15, -1, duration)).toBe(15);
  expect(stepValue(240, 1, duration)).toBe(240);
  expect(stepValue(3, 1, { min: 1, max: 20, step: 1, wrap: false })).toBe(4);
});
