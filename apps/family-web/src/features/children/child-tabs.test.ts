import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/i18n';
import { kid } from '@ab/web-kit/testing';
import { parseChildSearch, shownTab, tabOptions } from './child-tabs';

describe('a child page’s tabs', () => {
  it('a guardian sees the package; a child’s own login never does, in its own words', () => {
    expect(tabOptions('guardian', kid()).map((o) => o.value)).toEqual([
      'upcoming', 'attended', 'absent', 'recordings', 'package',
    ]);
    const own = tabOptions('student', kid());
    expect(own.map((o) => o.label)).toEqual([
      t.portal.upcomingTab, t.portal.app.child.attendedSelf, t.portal.app.child.absentSelf,
      t.lessonFiles.recordings,
    ]);
    expect(tabOptions('student', kid({ contact_is_self: true })).map((o) => o.value)).toContain('package');
  });

  it('an adult who registered themselves reads their own words, even signed in as a guardian', () => {
    const labels = tabOptions('guardian', kid({ contact_is_self: true })).map((o) => o.label);
    expect(labels).toContain(t.portal.app.child.attendedSelf);
  });

  it('?tab= opens a tab the login has, else «القادمة»; junk is dropped', () => {
    const tabs = tabOptions('student', kid());
    expect(shownTab(tabs, 'absent')).toBe('absent');
    expect(shownTab(tabs, 'package')).toBe('upcoming');
    expect(parseChildSearch({ tab: 'x' })).toEqual({});
    expect(parseChildSearch({ tab: 'package' })).toEqual({ tab: 'package' });
  });
});
