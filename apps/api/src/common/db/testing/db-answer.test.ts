import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { answerOf, answerOfRejection } from './db-answer';

describe('answerOf: the status and body a thrown error becomes', () => {
  it('an HttpException keeps its status and response body', () => {
    expect(answerOf(new ConflictException({ message: 'duplicate', detail: 'd' }))).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: 'd' },
    });
    expect(answerOf(new NotFoundException()).status).toBe(404);
  });

  it('any other error is a 500 carrying its message', () => {
    expect(answerOf(new Error('db error XX000: boom'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
    expect(answerOf('text')).toEqual({ status: 500, body: 'text' });
  });

  it('answerOfRejection fails when the call resolves', async () => {
    await expect(answerOfRejection(Promise.resolve(1))).rejects.toThrow(
      'expected the call to reject',
    );
    expect(await answerOfRejection(Promise.reject(new Error('x')))).toEqual({
      status: 500,
      body: 'x',
    });
  });
});
