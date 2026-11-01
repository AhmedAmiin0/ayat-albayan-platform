import { describe, expect, it } from 'vitest';
import { receiptsSchema } from './push-receipts';

// h2 (docs/36): getReceipts' body as a schema; ExpoReceipt = z.infer.
describe('receiptsSchema', () => {
  it('keeps ok and error receipts with their details', () => {
    const data = {
      a: { status: 'ok' },
      b: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered', expoPushToken: 'T' } },
    };
    expect(receiptsSchema.parse({ data })).toEqual(data);
  });

  it('no data yet → no receipts', () => {
    expect(receiptsSchema.parse({})).toEqual({});
  });

  it('an unknown receipt is an error that names no token (nothing pruned)', () => {
    expect(receiptsSchema.parse({ data: { a: { status: 'pending' } } })).toEqual({
      a: { status: 'error', message: 'unreadable receipt' },
    });
  });

  it('a body that is not an object fails the parse', () => {
    expect(receiptsSchema.safeParse('nope').success).toBe(false);
  });
});
