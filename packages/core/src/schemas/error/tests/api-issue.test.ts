import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiErrorSchema, apiIssueSchema } from '../api-error';
import { toApiIssues } from '../api-issues';

const firstIssue = (schema: z.ZodType, value: unknown): unknown => {
  const result = schema.safeParse(value);
  return result.success ? undefined : { ...result.error.issues[0], path: 'a' };
};

describe('apiIssueSchema: one validation issue as the api sends it', () => {
  it('keeps the zod code and the limits it carries', () => {
    const issue = firstIssue(z.string().min(2, 'too_short'), 'x');
    expect(apiIssueSchema.parse(issue)).toEqual({
      path: 'a',
      message: 'too_short',
      code: 'too_small',
      origin: 'string',
      minimum: 2,
      inclusive: true,
    });
  });

  it('drops the input and anything else zod adds', () => {
    const issue = firstIssue(
      z.string().refine(() => false, { params: { x: 1 } }),
      'secret',
    );
    expect(apiIssueSchema.parse(issue)).toEqual({
      path: 'a',
      message: 'Invalid input',
      code: 'custom',
    });
  });

  it('turns a bigint limit into a number so the body stays json', () => {
    const issue = firstIssue(z.bigint().max(5n), 9n);
    expect(apiIssueSchema.parse(issue)).toMatchObject({ code: 'too_big', maximum: 5 });
  });

  it('keeps the values, keys, format and expected type', () => {
    const issues = [
      firstIssue(z.enum(['a', 'b']), 'c'),
      firstIssue(z.strictObject({}), { k: 1 }),
      firstIssue(z.email(), 'x'),
      firstIssue(z.number(), 'x'),
    ];
    expect(issues.map((i) => apiIssueSchema.parse(i))).toMatchObject([
      { code: 'invalid_value', values: ['a', 'b'] },
      { code: 'unrecognized_keys', keys: ['k'] },
      { code: 'invalid_format', format: 'email' },
      { code: 'invalid_type', expected: 'number' },
    ]);
  });

  it('still reads an issue of an older api with only path and message', () => {
    const body = { code: 'validation_failed', issues: [{ path: 'a', message: 'm' }] };
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });

  it('joins the path with dots and keeps a root issue at the empty path', () => {
    const schema = z.object({ items: z.array(z.object({ n: z.string().max(1) })) });
    const result = schema.safeParse({ items: [{ n: 'ab' }] });
    expect(toApiIssues(result.error?.issues ?? [])).toEqual([
      {
        path: 'items.0.n',
        message: expect.any(String),
        code: 'too_big',
        origin: 'string',
        maximum: 1,
        inclusive: true,
      },
    ]);
    const root = z
      .object({})
      .refine(() => false, 'empty_update')
      .safeParse({});
    expect(toApiIssues(root.error?.issues ?? [])).toEqual([
      { path: '', message: 'empty_update', code: 'custom' },
    ]);
  });
});
