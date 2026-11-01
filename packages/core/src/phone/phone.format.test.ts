import { describe, expect, it } from 'vitest';
import { formatPhone } from './phone.js';

// docs/07 §6: phones are read back to guardians, so they are shown grouped; stored as E.164.
describe('formatPhone (display only, rule 7)', () => {
  it.each([
    ['+966552147730', '+966 55 214 7730'],
    ['+201066123049', '+20 10 6612 3049'],
    ['+96565012345', '+965 6501 2345'],
    ['+97455123456', '+974 5512 3456'],
    ['+96891234567', '+968 9123 4567'],
    ['+97336001122', '+973 3600 1122'],
  ])('%s → %s', (e164, shown) => {
    expect(formatPhone(e164)).toBe(shown);
  });

  it.each(['+447700900123', '+9665521477', '+2010661230499', '', 'not a phone'])('leaves %j unchanged', (v) => {
    expect(formatPhone(v)).toBe(v);
  });
});
