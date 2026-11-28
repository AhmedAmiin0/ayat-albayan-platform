import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { salesStudentsQuerySchema } from '../academy-students.schemas';

describe('The sales students page query, pinned before it spreads pageQuery', () => {
  it.each(pageGoldenCases({ size: 25, max: 100 }))(
    'answers $input as today',
    ({ input, expected }) => {
      expect(pageOutcome(salesStudentsQuerySchema, input)).toEqual(expected);
    },
  );
});
