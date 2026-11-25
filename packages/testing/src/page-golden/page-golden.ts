import { z } from 'zod';
import type { PageGoldenCase, PageGoldenSpec, PageOutcome } from './page-golden.types';

const PAST_CAP = 10_001;
const read = z.object({ page: z.number(), pageSize: z.number() });

const issue = (code: string, key: string): PageOutcome => ({ issues: [{ code, path: [key] }] });

function pastCap(spec: PageGoldenSpec): PageOutcome {
  const capped = spec.lastPage !== undefined && spec.lastPage < PAST_CAP;
  return capped ? issue('too_big', 'page') : { page: PAST_CAP, pageSize: spec.size };
}

/** The payloads every page query copy is pinned with, and what it answers today. */
export function pageGoldenCases(spec: PageGoldenSpec): PageGoldenCase[] {
  const { size, max } = spec;
  return [
    { input: {}, expected: { page: 1, pageSize: size } },
    { input: { page: '2', pageSize: String(max) }, expected: { page: 2, pageSize: max } },
    { input: { page: '10000' }, expected: { page: 10_000, pageSize: size } },
    { input: { page: String(PAST_CAP) }, expected: pastCap(spec) },
    { input: { page: '0' }, expected: issue('too_small', 'page') },
    { input: { page: '1.5' }, expected: issue('invalid_type', 'page') },
    { input: { page: 'x' }, expected: issue('invalid_type', 'page') },
    { input: { pageSize: '0' }, expected: issue('too_small', 'pageSize') },
    { input: { pageSize: String(max + 1) }, expected: issue('too_big', 'pageSize') },
  ];
}

/** The page a query schema reads from `input`, or its issues' codes and paths. */
export function pageOutcome(schema: z.ZodType, input: Record<string, string>): PageOutcome {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { issues: result.error.issues.map(({ code, path }) => ({ code, path })) };
  }
  const { page, pageSize } = read.parse(result.data);
  return { page, pageSize };
}
