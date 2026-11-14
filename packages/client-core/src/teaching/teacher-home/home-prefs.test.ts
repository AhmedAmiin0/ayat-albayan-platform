import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME_PREFS, parseHomePrefs, withAlert } from './home-prefs.js';

describe('parseHomePrefs', () => {
  it('defaults to everything on and comfortable rows', () => {
    expect(parseHomePrefs(null)).toEqual({
      alerts: { soon: true, confirm: true, changed: true, report: true, bell: true },
      ended: true,
      hero: true,
      density: 'comfortable',
    });
    expect(DEFAULT_HOME_PREFS).toEqual(parseHomePrefs(null));
  });

  it('reads a saved choice', () => {
    const saved = { ...DEFAULT_HOME_PREFS, hero: false, density: 'compact' };
    expect(parseHomePrefs(JSON.stringify(saved))).toEqual(saved);
  });

  it('keeps the defaults for broken text, a wrong shape or unknown values', () => {
    expect(parseHomePrefs('{not json')).toEqual(DEFAULT_HOME_PREFS);
    expect(parseHomePrefs('42')).toEqual(DEFAULT_HOME_PREFS);
    const odd = parseHomePrefs(JSON.stringify({ density: 'huge', ended: 'no', alerts: { bell: false } }));
    expect(odd).toEqual({ ...withAlert(DEFAULT_HOME_PREFS, 'bell', false) });
  });

  it('keeps every alert on when the alerts value is not an object', () => {
    expect(parseHomePrefs(JSON.stringify({ alerts: 3 })).alerts).toEqual(DEFAULT_HOME_PREFS.alerts);
  });
});

describe('withAlert', () => {
  it('flips one kind only', () => {
    const next = withAlert(DEFAULT_HOME_PREFS, 'soon', false);
    expect(next.alerts).toEqual({ ...DEFAULT_HOME_PREFS.alerts, soon: false });
    expect(DEFAULT_HOME_PREFS.alerts.soon).toBe(true);
  });
});
