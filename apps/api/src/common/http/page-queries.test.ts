import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { peopleListQuerySchema } from '@ab/shared';
import { pageQueryShape } from '@/modules/sales/leads';
import { pageQuerySchema } from './http';

describe.each([
  { name: 'the common page query', schema: pageQuerySchema, size: 25 },
  { name: 'the leads and applicants page query', schema: z.object(pageQueryShape), size: 25 },
  { name: 'the guardians and students page query', schema: peopleListQuerySchema, size: 20 },
])('$name', ({ schema, size }) => {
  it.each(pageGoldenCases({ size, max: 100 }))('answers $input', ({ input, expected }) => {
    expect(pageOutcome(schema, input)).toEqual(expected);
  });
});
