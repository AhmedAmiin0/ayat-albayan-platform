import { describe, expect, it } from 'vitest';
import { pageGoldenCases } from './page-golden';

describe('page golden cases', () => {
  it('expects page 10001 to be refused by every page query', () => {
    const past = pageGoldenCases({ size: 20, max: 50 })[3];
    expect(past).toEqual({
      input: { page: '10001' },
      expected: { issues: [{ code: 'too_big', path: ['page'] }] },
    });
  });
});
