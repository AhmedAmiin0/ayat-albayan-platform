import { describe, expect, it } from 'vitest';
import { statusValue } from './status.ts';

const only = (value: ReturnType<typeof statusValue>) => (value.statuses as unknown[])[0];

describe('wa-stub: delivery status value', () => {
  it('sent and delivered carry the conversation and pricing', () => {
    for (const status of ['sent', 'delivered'] as const) {
      expect(only(statusValue({ id: 'w1', status, timestamp: 1700000000 }, '9665'))).toEqual({
        id: 'w1',
        status,
        timestamp: '1700000000',
        recipient_id: '9665',
        conversation: { id: 'conv-9665', origin: { type: 'utility' } },
        pricing: { billable: true, pricing_model: 'PMP', category: 'utility' },
      });
    }
  });

  it('read carries neither pricing nor errors', () => {
    expect(only(statusValue({ id: 'w2', status: 'read', timestamp: 5 }, '9665'))).toEqual({
      id: 'w2',
      status: 'read',
      timestamp: '5',
      recipient_id: '9665',
    });
  });

  it('failed defaults to 131026 «Message undeliverable», or the given code and title', () => {
    const plain = only(statusValue({ id: 'w3', status: 'failed' }, '9665'));
    expect(plain).toMatchObject({ errors: [{ code: 131026, title: 'Message undeliverable' }] });
    const given = {
      id: 'w4',
      status: 'failed',
      errorCode: 131047,
      errorTitle: 'Re-engage',
    } as const;
    expect(only(statusValue(given, '9665'))).toMatchObject({
      errors: [{ code: 131047, title: 'Re-engage' }],
    });
  });
});
