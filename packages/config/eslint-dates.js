// Dates go through the @ab/shared date-fns facade (owner 2026-10-30: «You can use date-fns instead of
// handling date», docs/34 §6): its src/time (and tests, which may check against Intl) are the only
// place these may appear. The ones that predate the rule sit in eslint-suppressions.json.
const facade = 'use the date-fns facade in @ab/shared (src/time: localDateIn, dateText, clockOf…)';
export const dateRestrictions = [
  { object: 'Intl', property: 'DateTimeFormat', message: `Intl.DateTimeFormat: ${facade}.` },
  { property: 'toLocaleDateString', message: `toLocaleDateString: ${facade}.` },
  { property: 'toLocaleTimeString', message: `toLocaleTimeString: ${facade}.` },
  { property: 'getTimezoneOffset', message: `getTimezoneOffset: ${facade} (offsetMinutesIn).` },
];
