import { criticalSpring, MATERIALIZE_RESPONSE_MS, STEP_RESPONSE_MS } from './spring';

// A critically damped spring: damping² = 4 · stiffness · mass (ratio exactly 1, no overshoot).
test('0.35 s response → k ≈ 322, c ≈ 35.9, mass 1, ratio 1', () => {
  const s = criticalSpring(MATERIALIZE_RESPONSE_MS);
  expect(s.mass).toBe(1);
  expect(s.stiffness).toBeCloseTo(322.27, 1);
  expect(s.damping).toBeCloseTo(35.9, 1);
  expect(s.damping ** 2).toBeCloseTo(4 * s.stiffness * s.mass, 6);
});

test('a slower response is a softer spring, still critically damped', () => {
  const fast = criticalSpring(MATERIALIZE_RESPONSE_MS);
  const slow = criticalSpring(STEP_RESPONSE_MS);
  expect(slow.stiffness).toBeLessThan(fast.stiffness);
  expect(slow.damping ** 2).toBeCloseTo(4 * slow.stiffness, 6);
});
