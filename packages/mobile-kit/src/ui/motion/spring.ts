// Springs by Apple's two numbers (WWDC23 «Animate with springs»): `response` (how long one
// oscillation would take) and the damping ratio, here always 1 = critically damped: it settles
// as fast as it can without overshoot. RN's Animated.spring takes stiffness / damping / mass.

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

/** The first screen materializes from the startup cover (scale + opacity, docs/50). */
export const MATERIALIZE_RESPONSE_MS = 350;
/** One sign-in step to the next (number → code, WhatsApp ↔ password) and the stage's height. */
export const STEP_RESPONSE_MS = 400;

/** Mass 1: stiffness = (2π / response)², damping = 2 · √stiffness (ratio 1). */
export function criticalSpring(responseMs: number): SpringConfig {
  const omega = (2 * Math.PI) / (responseMs / 1000);
  return { stiffness: omega * omega, damping: 2 * omega, mass: 1 };
}
