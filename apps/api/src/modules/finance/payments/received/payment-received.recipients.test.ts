import { describe, expect, it } from 'vitest';
import { receivedRecipients } from './payment-received.recipients';

describe('receivedRecipients («تم استلام دفعة»)', () => {
  it('every admin plus the student’s assistant, once each', () => {
    const ids = receivedRecipients({ admins: ['a1', 'a2'], owners: ['s1', 'a1'], recorderId: null });
    expect(ids).toEqual(['a1', 'a2', 's1']);
  });

  it('whoever recorded the payment is left out (an admin, or the assistant from the chat)', () => {
    expect(receivedRecipients({ admins: ['a1', 'a2'], owners: ['s1'], recorderId: 'a1' })).toEqual([
      'a2',
      's1',
    ]);
    expect(receivedRecipients({ admins: ['a1'], owners: ['s1'], recorderId: 's1' })).toEqual(['a1']);
  });

  it('no assistant → the admins only; nobody at all → nobody', () => {
    expect(receivedRecipients({ admins: ['a1'], owners: [], recorderId: null })).toEqual(['a1']);
    expect(receivedRecipients({ admins: ['a1'], owners: [], recorderId: 'a1' })).toEqual([]);
  });
});
