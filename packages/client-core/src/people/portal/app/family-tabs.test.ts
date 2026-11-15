import { describe, expect, it } from 'vitest';
import { familyTabs, hasFamilyTab } from './family-tabs.js';

describe('familyTabs', () => {
  it('a guardian: home, schedule, children, account', () => {
    expect(familyTabs('guardian')).toEqual(['home', 'schedule', 'children', 'account']);
    expect(hasFamilyTab('guardian', 'reports')).toBe(false);
  });

  it('a student never gets «أبنائي»; their reports have a tab', () => {
    expect(familyTabs('student')).toEqual(['home', 'schedule', 'reports', 'account']);
    expect(hasFamilyTab('student', 'children')).toBe(false);
    expect(hasFamilyTab('student', 'reports')).toBe(true);
  });
});
