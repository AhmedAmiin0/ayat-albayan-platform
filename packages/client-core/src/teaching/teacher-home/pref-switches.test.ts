import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME_PREFS } from './home-prefs.js';
import { prefSwitches, type PrefSwitchWords } from './pref-switches.js';

const W: PrefSwitchWords = {
  kind: { soon: 's', confirm: 'c', changed: 'x', report: 'r', bell: 'b' },
  hero: 'h',
  ended: 'e',
  compact: 'k',
};

describe('prefSwitches', () => {
  it('lists the kinds, then hero, ended and compact, with their values', () => {
    const g = prefSwitches(DEFAULT_HOME_PREFS, W);
    expect(g.alerts.map((s) => [s.id, s.label, s.value])).toEqual([
      ['soon', 's', true], ['confirm', 'c', true], ['changed', 'x', true], ['report', 'r', true], ['bell', 'b', true],
    ]);
    expect(g.display.map((s) => [s.id, s.value])).toEqual([['hero', true], ['ended', true], ['compact', false]]);
  });

  it('each switch makes the prefs it names', () => {
    const g = prefSwitches(DEFAULT_HOME_PREFS, W);
    expect(g.alerts[4]?.next(false).alerts.bell).toBe(false);
    expect(g.display[0]?.next(false).hero).toBe(false);
    expect(g.display[1]?.next(false).ended).toBe(false);
    expect(g.display[2]?.next(true).density).toBe('compact');
    expect(g.display[2]?.next(false).density).toBe('comfortable');
  });
});
