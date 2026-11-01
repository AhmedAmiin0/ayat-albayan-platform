// The clock helpers other folders import (module boundaries: through this index). They move to
// @ab/time in docs/32 k3b; the text, digit and phone helpers left for @ab/core in k3a.
export type { ClockOptions } from './clock.js';
export { clockOfParts, isolateClock } from './clock.js';
export type { ClockCycle } from './clock-pref.js';
export { CAIRO_TZ, RIYADH_TZ } from './zones.js';
