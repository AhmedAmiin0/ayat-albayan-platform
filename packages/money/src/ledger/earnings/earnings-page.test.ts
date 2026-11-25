import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { earningsListQuery, teacherPaymentListQuery } from './earnings-schemas';

describe.each([
  ['earnings sessions', earningsListQuery],
  ['teacher payments', teacherPaymentListQuery],
])('The %s page query, pinned before it spreads pageQuery', (_name, schema) => {
  it.each(pageGoldenCases({ size: 25, max: 100 }))(
    'answers $input as today',
    ({ input, expected }) => {
      expect(pageOutcome(schema, input)).toEqual(expected);
    },
  );
});
