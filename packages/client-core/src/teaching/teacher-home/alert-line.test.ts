import { describe, expect, it } from 'vitest';
import { alertLine, type AlertWords } from './alert-line.js';
import type { AlertParts } from './alert-parts.js';

const W: AlertWords = {
  soon: '{names} {when}',
  confirm: 'confirm {names} {time}',
  report: { write: 'write {names}', resume: 'resume {names}', window: 'window {names}' },
  inMinutes: { one: 'in a minute', two: 'in two', few: 'in {n} few', other: 'in {n}' },
  cancelledTeacher: 'you cancelled {names} {time}',
  cancelledAdmin: 'office cancelled {names} {time}',
  movedTo: '{names} {time} -> {to}',
  movedFrom: '{names} {time} <- {from}',
  movedAway: '{names} {time} moved',
};
const parts = (p: Partial<AlertParts>): AlertParts => ({
  text: 'confirm',
  vars: { names: 'S', time: '16:00' },
  detail: null,
  action: 'open',
  ...p,
});

describe('alertLine', () => {
  it('soon counts the minutes with the plural forms', () => {
    expect(alertLine(parts({ text: 'soon', vars: { names: 'S', minutes: '1' } }), W)).toBe('S in a minute');
    expect(alertLine(parts({ text: 'soon', vars: { names: 'S', minutes: '5' } }), W)).toBe('S in 5 few');
  });

  it('fills confirm and the change lines', () => {
    expect(alertLine(parts({}), W)).toBe('confirm S 16:00');
    expect(alertLine(parts({ text: 'cancelledAdmin' }), W)).toBe('office cancelled S 16:00');
    expect(alertLine(parts({ text: 'movedTo', vars: { names: 'S', time: 't', to: 'x' } }), W)).toBe('S t -> x');
    expect(alertLine(parts({ text: 'movedFrom', vars: { names: 'S', time: 't', from: 'y' } }), W)).toBe('S t <- y');
    expect(alertLine(parts({ text: 'movedAway' }), W)).toBe('S 16:00 moved');
    expect(alertLine(parts({ text: 'cancelledTeacher' }), W)).toBe('you cancelled S 16:00');
  });

  it('picks the report template by stage (write when unknown)', () => {
    expect(alertLine(parts({ text: 'report', vars: { names: 'S', stage: 'window' } }), W)).toBe('window S');
    expect(alertLine(parts({ text: 'report', vars: { names: 'S', stage: 'odd' } }), W)).toBe('write S');
  });

  it('a bell row reads its own title', () => {
    expect(alertLine(parts({ text: 'bell', vars: { title: 'T' } }), W)).toBe('T');
    expect(alertLine(parts({ text: 'bell', vars: {} }), W)).toBe('');
  });
});
