import { describe, expect, it } from 'vitest';
import { event, services } from '../webhook.fakes';

// number_id on inbound rows: module mode stamps the overlay's row; legacy looks the receiving
// phone_number_id up in wa_numbers, as the chat import of 2026-10-25 stamped it.

describe('inbound number_id', () => {
  it('legacy: from the payload\'s phone_number_id', async () => {
    const s = services();
    s.queries.numberIdFor.mockResolvedValue('num-chat');
    await s.inbound.handle(event({ line: 'chat', phoneNumberId: 'pnid-chat' }));
    expect(s.queries.numberIdFor).toHaveBeenCalledWith('pnid-chat');
    expect(s.queries.stored).toEqual([expect.objectContaining({ number_id: 'num-chat', line: 'chat' })]);
  });

  it('module mode: the overlay\'s number wins, no lookup', async () => {
    const s = services();
    await s.inbound.handle(event({ numberId: 'num-module', phoneNumberId: 'pnid-chat' }));
    expect(s.queries.numberIdFor).not.toHaveBeenCalled();
    expect(s.queries.stored[0]).toMatchObject({ number_id: 'num-module' });
  });

  it('no wa_numbers row, no id, or a failed lookup → no number_id key, the message still stored', async () => {
    const s = services();
    await s.inbound.handle(event({ waMessageId: 'w1', phoneNumberId: 'unknown' }));
    await s.inbound.handle(event({ waMessageId: 'w2' }));
    s.queries.numberIdFor.mockRejectedValue(new Error('db down'));
    await s.inbound.handle(event({ waMessageId: 'w3', phoneNumberId: 'pnid' }));
    expect(s.queries.stored).toHaveLength(3);
    s.queries.stored.forEach((r) => expect(r).not.toHaveProperty('number_id'));
  });
});
