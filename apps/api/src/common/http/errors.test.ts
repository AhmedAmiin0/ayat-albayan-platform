import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { answerOf } from '@/common/db/testing/db-answer';
import { httpError } from './errors';

describe('httpError: the one domain error body', () => {
  it('answers the status with the code as both code and message', () => {
    expect(answerOf(httpError(HttpStatus.CONFLICT, 'template_not_approved'))).toEqual({
      status: 409,
      body: { code: 'template_not_approved', message: 'template_not_approved' },
    });
  });

  it('spreads its details beside the code', () => {
    expect(answerOf(httpError(503, 'not_configured', { retry: true }))).toEqual({
      status: 503,
      body: { code: 'not_configured', message: 'not_configured', retry: true },
    });
  });

  it('details spread last, as in the two helpers it replaces', () => {
    expect(answerOf(httpError(400, 'bad', { code: 'other', message: 'other' }))).toEqual({
      status: 400,
      body: { code: 'other', message: 'other' },
    });
  });
});
