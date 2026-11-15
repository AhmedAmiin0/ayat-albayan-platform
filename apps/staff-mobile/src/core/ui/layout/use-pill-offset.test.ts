import { PILL_SPRING, pillTarget } from './use-pill-offset';

test('the pill moves toward the inline-end: left in Arabic, right in English', () => {
  expect(pillTarget({ index: 2, tabWidth: 70, rtl: true })).toBe(-140);
  expect(pillTarget({ index: 2, tabWidth: 70, rtl: false })).toBe(140);
});

test('the spring answers in ~0.3 s with no overshoot (critically damped)', () => {
  const { stiffness, damping, mass, overshootClamping } = PILL_SPRING;
  const omega = Math.sqrt(stiffness / mass);
  expect((2 * Math.PI) / omega).toBeCloseTo(0.3, 5);
  expect(damping / (2 * Math.sqrt(stiffness * mass))).toBeCloseTo(1, 5);
  expect(overshootClamping).toBe(true);
});
