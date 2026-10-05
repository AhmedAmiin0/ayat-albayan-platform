import { describe, expect, it } from 'vitest';
import { BUNDLES } from '../../common/i18n/server-text';
import { DEFAULTS, listKeys, overrideProblem } from './translations.catalog';

const none = { ar: {}, en: {} };
const q = (over: Partial<Parameters<typeof listKeys>[0]> = {}) => ({ page: 1, pageSize: 50, ...over });

describe('listKeys (GET /i18n/keys)', () => {
  it('lists every bundled key with both defaults, sorted, one page at a time', () => {
    const page = listKeys(q({ pageSize: 10 }), none);
    expect(page.total).toBe(Object.keys(DEFAULTS.ar).length);
    expect(page.items).toHaveLength(10);
    const keys = page.items.map((r) => r.key);
    expect(keys).toEqual([...keys].sort());
    expect(page.sections).toContain('nav');
  });

  it('filters by section and by search over key and texts (case-insensitive)', () => {
    const nav = listKeys(q({ section: 'nav' }), none);
    expect(nav.items.every((r) => r.section === 'nav')).toBe(true);
    const hit = listKeys(q({ search: BUNDLES.en.nav.leads.toUpperCase() }), none);
    expect(hit.items.map((r) => r.key)).toContain('nav.leads');
    expect(listKeys(q({ search: 'NAV.LEADS' }), none).items[0]?.key).toBe('nav.leads');
  });

  it('carries the overrides of each locale and finds rows by their override text', () => {
    const overrides = { ar: { 'nav.leads': 'zz-override' }, en: {} };
    const page = listKeys(q({ search: 'zz-override' }), overrides);
    expect(page.items).toEqual([
      { key: 'nav.leads', section: 'nav', ar: BUNDLES.ar.nav.leads, en: BUNDLES.en.nav.leads, arOverride: 'zz-override', enOverride: null },
    ]);
  });
});

describe('overrideProblem (PUT validation)', () => {
  it('accepts a known key whose value keeps every slot', () => {
    expect(overrideProblem('en', 'translations.count', 'Total: {n}')).toBeNull();
  });

  it('rejects a key the bundle does not have, or a path to a section', () => {
    expect(overrideProblem('ar', 'nav.nope', 'x')).toEqual({ kind: 'unknown_key' });
    expect(overrideProblem('ar', 'nav', 'x')).toEqual({ kind: 'unknown_key' });
    expect(overrideProblem('ar', '__proto__', 'x')).toEqual({ kind: 'unknown_key' });
  });

  it('rejects a value that drops a {placeholder} of the default', () => {
    expect(overrideProblem('en', 'translations.count', 'Total')).toEqual({ kind: 'placeholders_missing', missing: ['{n}'] });
  });
});
