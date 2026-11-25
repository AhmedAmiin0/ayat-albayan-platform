import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { studentRecordingsQuerySchema } from './student-recordings';

describe('The student recordings page query, pinned before it spreads pageQuery', () => {
  it.each(pageGoldenCases({ size: 10, max: 100 }))(
    'answers $input as today',
    ({ input, expected }) => {
      expect(pageOutcome(studentRecordingsQuerySchema, input)).toEqual(expected);
    },
  );
});
