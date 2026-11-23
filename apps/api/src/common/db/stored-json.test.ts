import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseStoredJson, StoredJsonError } from './stored-json';

const shape = z.object({ ids: z.array(z.string()) });
const at = { table: 'teacher_payouts', column: 'breakdown' };

describe('parseStoredJson (a jsonb column is parsed, never cast)', () => {
  it('returns the parsed value of a valid column', () => {
    expect(parseStoredJson(shape, { ids: ['a'] }, at)).toEqual({ ids: ['a'] });
  });

  it('refuses a malformed column with a 500 stored_json_invalid naming the column', () => {
    const run = () => parseStoredJson(shape, { ids: [1] }, at);
    expect(run).toThrow(StoredJsonError);
    try {
      run();
    } catch (e) {
      const err = e as StoredJsonError;
      expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(err.getResponse()).toEqual({
        code: 'stored_json_invalid',
        message: 'stored_json_invalid',
        table: 'teacher_payouts',
        column: 'breakdown',
      });
    }
  });
});
