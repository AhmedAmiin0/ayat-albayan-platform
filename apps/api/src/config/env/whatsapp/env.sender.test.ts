import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SENDER_SHAPE } from './env.sender';

const schema = z.object(SENDER_SHAPE);

describe('MESSAGE_SENDER_CONCURRENCY (docs/42 42-7)', () => {
  it('defaults to 1 (unset or blank)', () => {
    expect(schema.parse({}).MESSAGE_SENDER_CONCURRENCY).toBe(1);
    expect(schema.parse({ MESSAGE_SENDER_CONCURRENCY: '' }).MESSAGE_SENDER_CONCURRENCY).toBe(1);
  });

  it('takes 1…8, refuses anything else', () => {
    expect(schema.parse({ MESSAGE_SENDER_CONCURRENCY: '4' }).MESSAGE_SENDER_CONCURRENCY).toBe(4);
    expect(schema.safeParse({ MESSAGE_SENDER_CONCURRENCY: '0' }).success).toBe(false);
    expect(schema.safeParse({ MESSAGE_SENDER_CONCURRENCY: '9' }).success).toBe(false);
  });
});
