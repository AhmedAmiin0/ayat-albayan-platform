import { BadRequestException, ConflictException } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { answerOf } from '@/common/db/testing/db-answer';
import { pgError, uniqueViolationOn } from '@/common/db/errors';

const pg = (code: string, message = 'boom', details = 'd') =>
  new PostgrestError({ code, message, details, hint: '' });
const unique = pg('23505', 'duplicate key value violates unique constraint "leads_phone_key"');

describe('pgError: the default map is the api dbError answer, unchanged', () => {
  it.each([
    ['23505', 409, { message: 'duplicate', detail: 'd' }],
    ['23503', 409, { message: 'fk_violation', detail: 'd' }],
    ['PGRST103', 400, { message: 'page_out_of_range' }],
    ['XX000', 500, 'db error XX000: boom'],
  ])('%s answers %i', (code, status, body) => {
    expect(answerOf(pgError(pg(code)))).toEqual({ status, body });
  });

  it('keeps the exception classes callers test with instanceof', () => {
    expect(pgError(pg('23505'))).toBeInstanceOf(ConflictException);
    expect(pgError(pg('PGRST103'))).toBeInstanceOf(BadRequestException);
  });

  it('an inherited key such as constructor is not a code', () => {
    expect(answerOf(pgError(pg('constructor')))).toEqual({
      status: 500,
      body: 'db error constructor: boom',
    });
  });
});

describe('pgError: a local map wins over the default', () => {
  const taken = () => new ConflictException('phone_taken');

  it('by code', () => {
    expect(answerOf(pgError(unique, { codes: { '23505': taken } })).body).toMatchObject({
      message: 'phone_taken',
    });
  });

  it('by constraint name, before the code', () => {
    const map = {
      codes: { '23505': () => new Error('code') },
      constraints: { leads_phone_key: taken },
    };
    expect(pgError(unique, map)).toBeInstanceOf(ConflictException);
    expect(pgError(pg('23505', 'violates unique constraint "other"'), map).message).toBe('code');
  });

  it('by the message a function raised (P0001 only)', () => {
    const map = { raised: { slot_taken: taken } };
    expect(pgError(pg('P0001', 'slot_taken'), map)).toBeInstanceOf(ConflictException);
    expect(answerOf(pgError(pg('P0001', 'other'), map)).status).toBe(500);
    expect(answerOf(pgError(pg('XX000', 'slot_taken'), map)).status).toBe(500);
  });

  it('otherwise replaces only the last branch', () => {
    const map = { otherwise: () => new BadRequestException('else') };
    expect(answerOf(pgError(pg('XX000'), map)).status).toBe(400);
    expect(answerOf(pgError(pg('23505'), map)).status).toBe(409);
  });
});

describe('uniqueViolationOn', () => {
  it('names the constraint of a unique violation only', () => {
    expect(uniqueViolationOn(unique, 'leads_phone_key')).toBe(true);
    expect(uniqueViolationOn(unique, 'other_key')).toBe(false);
    expect(uniqueViolationOn(pg('23503', unique.message), 'leads_phone_key')).toBe(false);
  });
});
