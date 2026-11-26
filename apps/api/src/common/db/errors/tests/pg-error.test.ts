import { BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { answerOf } from '@/common/db/testing/db-answer';
import {
  isUniqueViolation,
  pgError,
  uniqueViolationMentions,
  UNIQUE_VIOLATION,
  uniqueViolationOn,
} from '@/common/db/errors';

const pg = (code: string, message = 'boom', details = 'd') =>
  new PostgrestError({ code, message, details, hint: '' });
const unique = pg('23505', 'duplicate key value violates unique constraint "leads_phone_key"');

describe('pgError: the default map', () => {
  it.each([
    ['23505', 409, { message: 'duplicate' }],
    ['23503', 409, { message: 'fk_violation' }],
    ['PGRST103', 400, { message: 'page_out_of_range' }],
    ['XX000', 500, 'db error XX000: boom'],
  ])('%s answers %i', (code, status, body) => {
    expect(answerOf(pgError(pg(code)))).toEqual({ status, body });
  });

  it('logs the message and details a conflict no longer answers', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    pgError(pg('23503', 'fk violation', 'Key (id)=(x) is not present.'));
    expect(warn).toHaveBeenCalledWith('23503 fk violation: Key (id)=(x) is not present.');
    warn.mockRestore();
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

describe('isUniqueViolation', () => {
  it('is true for SQLSTATE 23505 only', () => {
    expect(UNIQUE_VIOLATION).toBe('23505');
    expect(isUniqueViolation(unique)).toBe(true);
    expect(isUniqueViolation(pg('23503'))).toBe(false);
  });

  it('is false without an error or a code', () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation({})).toBe(false);
  });
});

describe('uniqueViolationMentions', () => {
  it('is a unique violation whose message has the text', () => {
    expect(uniqueViolationMentions(unique, 'phone_key')).toBe(true);
    expect(uniqueViolationMentions(unique, 'client_request_id')).toBe(false);
    expect(uniqueViolationMentions(pg('23503', unique.message), 'phone_key')).toBe(false);
    expect(uniqueViolationMentions(null, 'phone_key')).toBe(false);
  });
});
