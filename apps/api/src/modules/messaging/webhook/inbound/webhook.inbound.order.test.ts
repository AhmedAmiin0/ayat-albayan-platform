import { describe, expect, it } from 'vitest';
import { AT, event, services } from '../webhook.fakes';
import { orderedAt } from './webhook.inbound';

describe('orderedAt: two messages in one Meta second keep their arrival order', () => {
  it('keeps Meta’s time when the second is empty or holds only earlier messages', () => {
    expect(orderedAt(AT, null)).toEqual(AT);
    expect(orderedAt(AT, new Date(AT.getTime() - 1))).toEqual(AT);
  });

  it('goes 1 ms after an equal or later message of the same second', () => {
    expect(orderedAt(AT, AT)).toEqual(new Date(AT.getTime() + 1));
    expect(orderedAt(AT, new Date(AT.getTime() + 5))).toEqual(new Date(AT.getTime() + 6));
  });

  it('stores back-to-back messages of one second in the order they came', async () => {
    const s = services();
    await s.inbound.handle(event({ waMessageId: 'wamid.A', body: 'أولى' }));
    await s.inbound.handle(event({ waMessageId: 'wamid.B', body: 'تانية' }));
    await s.inbound.handle(event({ waMessageId: 'wamid.C', body: 'تالتة' }));
    const times = s.queries.stored.map((r) => [r.body, Date.parse(r.created_at ?? '')]);
    expect(times).toEqual([
      ['أولى', AT.getTime()],
      ['تانية', AT.getTime() + 1],
      ['تالتة', AT.getTime() + 2],
    ]);
  });

  it('a message of a later second keeps Meta’s time', async () => {
    const s = services();
    await s.inbound.handle(event({ waMessageId: 'wamid.A' }));
    const later = new Date(AT.getTime() + 1000);
    await s.inbound.handle(event({ waMessageId: 'wamid.B', at: later }));
    expect(s.queries.stored.map((r) => r.created_at)).toEqual([AT.toISOString(), later.toISOString()]);
  });
});
