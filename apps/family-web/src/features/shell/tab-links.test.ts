import { describe, expect, it } from 'vitest';
import { litFrom } from './tab-links';

describe('litFrom: a tab lit on its pages outside its path', () => {
  it('a report lights «التقارير»', () => {
    expect(litFrom('reports', '/report/r1')).toBe(true);
  });

  it('the other tabs stay dark there', () => {
    expect(litFrom('home', '/report/r1')).toBe(false);
    expect(litFrom('account', '/report/r1')).toBe(false);
  });

  it('«التقارير» itself is left to the router (no prefix match on /reports)', () => {
    expect(litFrom('reports', '/reports')).toBe(false);
  });
});
