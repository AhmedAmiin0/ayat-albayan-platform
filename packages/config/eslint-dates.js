// Dates go through the date-fns facade, @ab/time (owner 2026-10-30: «You can use date-fns
// instead of handling date», docs/34 §7; cut from @ab/shared in docs/32 k3b): that package (and
// tests, which may check against Intl) is the only place these may appear. The ones that predate
// the rule: eslint-suppressions.json.
const facade = 'use the date-fns facade @ab/time (localDateIn, dateText, clockOf…)';
export const dateRestrictions = [
  { object: 'Intl', property: 'DateTimeFormat', message: `Intl.DateTimeFormat: ${facade}.` },
  { property: 'toLocaleDateString', message: `toLocaleDateString: ${facade}.` },
  { property: 'toLocaleTimeString', message: `toLocaleTimeString: ${facade}.` },
  { property: 'getTimezoneOffset', message: `getTimezoneOffset: ${facade} (offsetMinutesIn).` },
];
