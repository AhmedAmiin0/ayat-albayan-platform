import { describe, expect, it } from 'vitest';
import { applyStrings, cloneBundle, flattenStrings, sectionOf } from './strings.js';
import type { FlatStrings } from './strings.js';

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

  it('skips leaves that are not text', () => {
    expect(flattenStrings({ a: 'x', n: 1, z: null, b: { c: 'y', d: true } })).toEqual({
      a: 'x',
      'b.c': 'y',
    });
  });

  it('section is the first path segment', () => {
    expect(sectionOf('common.pages.n')).toBe('common');
    expect(sectionOf('app')).toBe('app');
  });
});

describe('cloneBundle', () => {
  it('copies every level, so writes to the copy never reach the bundle', () => {
    const t = cloneBundle(bundle);
    t.common.pages.n = 'changed';
    expect(t).not.toBe(bundle);
    expect(bundle.common.pages.n).toBe('{n}');
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

  it('skips a value that is not text (an override row read off the network)', () => {
    const t = cloneBundle(bundle);
    const values: FlatStrings = {};
    Reflect.set(values, 'common.save', 7);
    Reflect.set(values, 'nav.inbox', null);
    expect(applyStrings(t, values)).toBe(0);
    expect(t).toEqual(bundle);
  });

  it('restoring = applying the defaults again', () => {
    const t = cloneBundle(bundle);
    applyStrings(t, { 'common.save': 'Keep' });
    applyStrings(t, flattenStrings(bundle));
    expect(t).toEqual(bundle);
  });
});
