import { ConflictException, NotFoundException } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { done, maybe, one, rows } from '@/common/db/errors';

const error = new PostgrestError({ code: '23505', message: 'dup', details: 'd', hint: '' });
const failed = { data: null, error } as const;
const taken = { codes: { '23505': () => new ConflictException('taken') } };

describe('rows / one / maybe / done: data on success, the mapped error on failure', () => {
  it('rows returns the rows', () => {
    expect(rows({ data: [{ id: 1 }], error: null })).toEqual([{ id: 1 }]);
  });

  it('one returns the row and answers 404 for no row', () => {
    expect(one({ data: { id: 1 }, error: null })).toEqual({ id: 1 });
    expect(() => one({ data: null, error: null })).toThrow(NotFoundException);
  });

  it('maybe returns the row or null', () => {
    expect(maybe({ data: { id: 1 }, error: null })).toEqual({ id: 1 });
    expect(maybe({ data: null, error: null })).toBeNull();
  });

  it('done does not throw on success', () => {
    expect(() => {
      done({ error: null });
    }).not.toThrow();
  });

  it.each([
    ['rows', () => rows(failed)],
    ['one', () => one(failed)],
    ['maybe', () => maybe(failed)],
    ['done', () => done(failed)],
  ])('%s throws the default answer', (_name, call) => {
    expect(call).toThrow(ConflictException);
  });

  it.each([
    ['rows', () => rows(failed, taken)],
    ['one', () => one(failed, taken)],
    ['maybe', () => maybe(failed, taken)],
    ['done', () => done(failed, taken)],
  ])('%s passes its map on', (_name, call) => {
    expect(call).toThrow('taken');
  });
});
