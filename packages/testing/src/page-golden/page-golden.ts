import type { z } from 'zod';
import type { PageGoldenCase, PageGoldenSpec, PageOutcome } from './page-golden.types';

/** Every page query stops at page 10 000 unless it sets a lower last page (docs/62 §6). */
const LAST_PAGE = 10_000;
const PAST_CAP = LAST_PAGE + 1;

const issue = (code: string, key: string): PageOutcome => ({ issues: [{ code, path: [key] }] });

/** The payloads every page query copy is pinned with, and what it answers. */
export function pageGoldenCases(spec: PageGoldenSpec): PageGoldenCase[] {
  const { size, max } = spec;
  return [
    { input: {}, expected: { page: 1, pageSize: size } },
    { input: { page: '2', pageSize: String(max) }, expected: { page: 2, pageSize: max } },
    { input: { page: String(LAST_PAGE) }, expected: { page: LAST_PAGE, pageSize: size } },
    { input: { page: String(PAST_CAP) }, expected: issue('too_big', 'page') },
    { input: { page: '0' }, expected: issue('too_small', 'page') },
    { input: { page: '1.5' }, expected: issue('invalid_type', 'page') },
    { input: { page: 'x' }, expected: issue('invalid_type', 'page') },
    { input: { pageSize: '0' }, expected: issue('too_small', 'pageSize') },
    { input: { pageSize: String(max + 1) }, expected: issue('too_big', 'pageSize') },
  ];
}

/** The page a query schema reads from `input`, or its issues' codes and paths. */
export function pageOutcome(
  schema: z.ZodType<{ page: number; pageSize: number }>,
  input: Record<string, string>,
): PageOutcome {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { issues: result.error.issues.map(({ code, path }) => ({ code, path })) };
  }
  const { page, pageSize } = result.data;
  return { page, pageSize };
}
