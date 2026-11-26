import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { pgError } from '@/common/db/errors';
import { answerOf } from '@/common/db/testing/db-answer';
import { peopleErrors } from './http';

const pg = (code: string) => new PostgrestError({ code, message: 'boom', details: 'd', hint: '' });
const nest = (statusCode: number, message: string, error: string) => ({
  status: statusCode,
  body: { statusCode, message, error },
});

const notFound = { status: 404, body: { statusCode: 404, message: 'Not Found' } };
const plain = (code: string) => ({ status: 500, body: `db error ${code}: boom` });

describe('peopleErrors: the people codes on top of the default map', () => {
  it.each([
    ['23505', nest(409, 'conflict', 'Conflict')],
    ['23503', nest(409, 'conflict', 'Conflict')],
    ['P0002', notFound],
    ['PGRST116', notFound],
    ['22023', nest(400, 'boom', 'Bad Request')],
    ['23514', nest(400, 'boom', 'Bad Request')],
    ['PGRST103', { status: 400, body: { message: 'page_out_of_range' } }],
    ['P0001', plain('P0001')],
    ['XX000', plain('XX000')],
  ])('%s', (code, answer) => {
    expect(answerOf(pgError(pg(code), peopleErrors()))).toEqual(answer);
  });

  it('a conflict names the code it is given', () => {
    expect(answerOf(pgError(pg('23503'), peopleErrors('phone_taken')))).toEqual(
      nest(409, 'phone_taken', 'Conflict'),
    );
  });
});
