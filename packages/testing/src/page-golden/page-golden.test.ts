import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { pageGoldenCases, pageOutcome } from './page-golden';

const query = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

describe('page golden cases', () => {
  it.each(pageGoldenCases({ size: 20, max: 50, lastPage: 10_000 }))(
    'pins $input',
    ({ input, expected }) => {
      expect(pageOutcome(query, input)).toEqual(expected);
    },
  );

  it('expects page 10001 to pass when the endpoint has no page cap', () => {
    const open = pageGoldenCases({ size: 20, max: 50 });
    expect(open[3]?.expected).toEqual({ page: 10_001, pageSize: 20 });
  });
});
