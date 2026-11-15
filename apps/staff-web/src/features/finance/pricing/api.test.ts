import { describe, expect, it } from 'vitest';
import { catalogSearch, INITIAL_SELECTION, OTHER, quoteSearch, type Selection } from './api';

const sel = (patch: Partial<Selection>): Selection => ({ ...INITIAL_SELECTION, ...patch });

describe('pricing query strings (GET /pricing/quote, /pricing/catalog)', () => {
  it('sends the site country, the package and every option', () => {
    expect(
      quoteSearch(sel({ country: 'KW', pkg: 'standard', duration: 45, students: 2, discount: 10 })),
    ).toBe('country=KW&duration=45&tier=standard&students=2&discount=10');
  });

  it('leaves the country out for «دولة تانية» (an empty country= is a 400)', () => {
    expect(quoteSearch(sel({ country: OTHER }))).not.toContain('country');
    expect(catalogSearch({ country: OTHER, duration: 60 })).toBe('duration=60');
  });

  it('sends count, never tier, for a custom lesson count', () => {
    const search = quoteSearch(sel({ pkg: 'custom', count: 20 }));
    expect(search).toMatch(/(^|&)count=20/);
    expect(search).not.toContain('tier');
  });

  it('sends tier, never count, for a package even when a custom count is kept', () => {
    const search = quoteSearch(sel({ pkg: 'weekly', count: 20 }));
    expect(search).toContain('tier=weekly');
    expect(search).not.toMatch(/(^|&)count=/);
  });

  it('catalog takes only country and duration', () => {
    expect(catalogSearch({ country: 'SA', duration: 30 })).toBe('country=SA&duration=30');
  });
});
