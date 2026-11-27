import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { translationKeysQuerySchema } from './translations';

describe('GET /i18n/keys page query, pinned before it spreads pageQuery', () => {
  it.each(pageGoldenCases({ size: 50, max: 100 }))(
    'answers $input as today',
    ({ input, expected }) => {
      expect(pageOutcome(translationKeysQuerySchema, input)).toEqual(expected);
    },
  );
});
