import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { pageGoldenCases, pageOutcome } from './page-golden';

const query = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

describe('page golden cases', () => {
  it.each(pageGoldenCases({ size: 20, max: 50 }))(
    'pins $input',
    ({ input, expected }) => {
      expect(pageOutcome(query, input)).toEqual(expected);
    },
  );

  it('expects page 10001 to be refused by every page query', () => {
    const past = pageGoldenCases({ size: 20, max: 50 })[3];
    expect(past).toEqual({
      input: { page: '10001' },
      expected: { issues: [{ code: 'too_big', path: ['page'] }] },
    });
  });
});
