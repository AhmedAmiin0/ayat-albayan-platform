import { describe, expect, it } from 'vitest';
import { clientRequestId, id } from './id';

const NIL = '00000000-0000-0000-0000-000000000000';
const V4 = '3f1c2a7e-9b4d-4e1a-8c2f-1d2e3f4a5b6c';
const LOOSE_HEX = '3f1c2a7e-9b4d-0e1a-0c2f-1d2e3f4a5b6c';

describe('id()', () => {
  it.each([V4, NIL, LOOSE_HEX])('accepts the hex shape ParseUUIDPipe accepted: %s', (value) => {
    expect(id().parse(value)).toBe(value);
  });

  it.each(['', 'abc', `${V4}x`, 42])('rejects %s', (value) => {
    expect(id().safeParse(value).success).toBe(false);
  });

  it('builds a new schema per call, so a describe() on one never leaks', () => {
    expect(id()).not.toBe(id());
  });
});

describe('clientRequestId', () => {
  it('accepts an RFC uuid and rejects free text', () => {
    expect(clientRequestId.parse(V4)).toBe(V4);
    expect(clientRequestId.safeParse('retry-1').success).toBe(false);
  });
});
