import { describe, expect, it } from 'vitest';
import { currentRequestId, pickRequestId, withRequestId } from './request-id';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('pickRequestId (honour a sane incoming X-Request-Id, else a new one)', () => {
  it('keeps a caller’s id (a proxy’s, the apps’)', () => {
    expect(pickRequestId('lb-7f3a.42')).toBe('lb-7f3a.42');
    expect(pickRequestId('3c5e8b1a-0d1c-4f6e-9a7b-2b8c4d6e8f00')).toBe('3c5e8b1a-0d1c-4f6e-9a7b-2b8c4d6e8f00');
  });

  it.each([
    ['absent', undefined],
    ['blank', ''],
    ['too long', 'a'.repeat(129)],
    ['a line break (log injection)', 'abc\nERROR fake line'],
    ['spaces', 'a b'],
    ['repeated header', ['a', 'b']],
  ])('%s → a new UUID', (_why, header) => {
    expect(pickRequestId(header)).toMatch(UUID);
  });
});

describe('withRequestId / currentRequestId (async context)', () => {
  it('the id is visible through awaits inside, and gone outside', async () => {
    expect(currentRequestId()).toBeUndefined();
    await new Promise<void>((resolve) => {
      withRequestId('r-1', () => {
        void (async () => {
          await new Promise((r) => setTimeout(r, 1));
          expect(currentRequestId()).toBe('r-1');
          resolve();
        })();
      });
    });
    expect(currentRequestId()).toBeUndefined();
  });
});
