import { HttpException, Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { asResponse } from '@/common/http/returns';

const view = z.object({
  id: z.string(),
  student: z.object({ name: z.string() }),
  status: z.enum(['held', 'missed']),
});
/** The same schema, open to any input, so a test can hand it a row that does not fit. */
const anyRow: z.ZodType<z.output<typeof view>, unknown> = view;

const thrown = (run: () => unknown): unknown => {
  try {
    run();
  } catch (e) {
    return e;
  }
  return undefined;
};

afterEach(() => vi.restoreAllMocks());

describe('asResponse', () => {
  it('keeps only the keys the schema names, at every depth', () => {
    const row = { id: 'l1', cancel_reason: 'x', student: { name: 'Nour', phone: '+20' } };
    expect(asResponse(view, { ...row, status: 'held' })).toEqual({
      id: 'l1',
      student: { name: 'Nour' },
      status: 'held',
    });
  });

  it('answers 500 response_invalid for a row that does not fit', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const e = thrown(() => asResponse(anyRow, { id: 'l1', student: { name: 'N' }, status: 'x' }));
    expect(e).toBeInstanceOf(HttpException);
    const answer = e instanceof HttpException ? [e.getStatus(), e.getResponse()] : [];
    expect(answer).toEqual([500, { code: 'response_invalid', message: 'response_invalid' }]);
  });

  it('logs the failing paths, never the values', () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    thrown(() => asResponse(anyRow, { id: 'secret-id', student: { name: 7 }, status: 'held' }));
    expect(error).toHaveBeenCalledWith('response_invalid at student.name');
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret-id');
  });
});
