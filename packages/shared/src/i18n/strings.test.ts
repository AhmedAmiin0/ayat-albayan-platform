import { describe, expect, it } from 'vitest';
import { applyStrings, cloneBundle, flattenStrings, sectionOf } from './strings.js';

const bundle = { nav: { leads: 'Leads', inbox: 'Inbox' }, common: { save: 'Save', pages: { n: '{n}' } } };

describe('flattenStrings / sectionOf', () => {
  it('flattens every string leaf to its dotted path', () => {
    expect(flattenStrings(bundle)).toEqual({
      'nav.leads': 'Leads',
      'nav.inbox': 'Inbox',
      'common.save': 'Save',
      'common.pages.n': '{n}',
    });
  });

  it('section is the first path segment', () => {
    expect(sectionOf('common.pages.n')).toBe('common');
    expect(sectionOf('app')).toBe('app');
  });
});

describe('applyStrings (merge overrides over a bundle)', () => {
  it('replaces leaves in place, so captured sub-objects see the change', () => {
    const t = cloneBundle(bundle);
    const { nav } = t;
    expect(applyStrings(t, { 'nav.leads': 'Prospects' })).toBe(1);
    expect(nav.leads).toBe('Prospects');
    expect(bundle.nav.leads).toBe('Leads');
  });

  it('skips unknown keys, objects, empty values and prototype paths', () => {
    const t = cloneBundle(bundle);
    const n = applyStrings(t, {
      'nav.nope': 'x',
      'common.pages': 'x',
      'common.save': '',
      '__proto__.polluted': 'x',
      'constructor.name': 'x',
    });
    expect(n).toBe(0);
    expect(t).toEqual(bundle);
    expect(Reflect.get({}, 'polluted')).toBeUndefined();
  });

  it('restoring = applying the defaults again', () => {
    const t = cloneBundle(bundle);
    applyStrings(t, { 'common.save': 'Keep' });
    applyStrings(t, flattenStrings(bundle));
    expect(t).toEqual(bundle);
  });
});
