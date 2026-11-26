import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hmacSha256Hex } from '@/common/infra/crypto/hmac';

const reference = (secret: string, data: string) =>
  createHmac('sha256', secret).update(data).digest('hex');

describe('hmacSha256Hex', () => {
  it('is the lower-case hex HMAC-SHA256 of the data', () => {
    expect(hmacSha256Hex('s3cret', ['{"a":1}'])).toBe(reference('s3cret', '{"a":1}'));
  });

  it('hashes the chunks as one message, strings and buffers alike', () => {
    const body = Buffer.from('{"x":true}');
    expect(hmacSha256Hex('k', ['1700000000.', body])).toBe(reference('k', '1700000000.{"x":true}'));
  });

  it('changes with the secret', () => {
    expect(hmacSha256Hex('a', ['m'])).not.toBe(hmacSha256Hex('b', ['m']));
  });
});
