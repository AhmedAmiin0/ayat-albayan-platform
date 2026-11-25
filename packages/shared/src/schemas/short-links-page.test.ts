import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { shortLinkListQuerySchema } from './short-links';

describe('GET /short-links page query, pinned before it spreads pageQuery', () => {
  it.each(pageGoldenCases({ size: 20, max: 100, lastPage: 10_000 }))(
    'answers $input as today',
    ({ input, expected }) => {
      expect(pageOutcome(shortLinkListQuerySchema, input)).toEqual(expected);
    },
  );
});
