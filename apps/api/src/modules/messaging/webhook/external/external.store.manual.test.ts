import type { TablesInsert } from '@ab/db';
import { describe, expect, it } from 'vitest';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { fakeQueries } from '@/modules/messaging/webhook/webhook.fakes';
import { externalServices, kapsoText } from './external.fakes';

// «أرسل عبر واتساب» (owner 2026-11-06, docs/19): EVERY external outbound text (the app's echo,
// Kapso's status of an unknown wamid, the catch-up job) first tries the row it confirms
// (ManualEcho), never a second bubble; anything else is stored as before.

const from = { line: 'chat' as const, numberId: 'num-chat' };
const text = () => kapsoText({ id: 'wamid.APP1', kapso: undefined });
const delivered: StatusEvent = {
  waMessageId: 'wamid.APP1',
  status: 'delivered',
  at: new Date('2026-11-06T10:06:00Z'),
  errorCode: null,
  errorText: null,
  conversationId: null,
  pricingCategory: null,
};

function setup() {
  const queries = fakeQueries();
  const stored: TablesInsert<'messages'>[] = queries.stored;
  return { ...externalServices(queries), stored };
}

describe('ExternalStore: a «أرسل عبر واتساب» text on every external path', () => {
  it.each([
    ['the echo', {}],
    ['Kapso’s status (adopt)', { event: delivered }],
    ['the catch-up job', {}],
  ])('%s: attached, known, no new row, the chat answered', async (_path, extra) => {
    const s = setup();
    s.manual.attach.mockResolvedValue(true);
    await expect(s.store.store({ message: text(), from, ...extra })).resolves.toBe('known');
    expect(s.manual.attach).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+966501234567', from: { line: 'chat', numberId: 'num-chat' } }),
    );
    expect(s.stored).toHaveLength(0);
    expect(s.ext.markAnsweredRead).toHaveBeenCalled();
  });

  it('our own send to the phone is unrecorded: skipped, never attached (it may be ours)', async () => {
    const s = setup();
    s.ext.inFlight.mockResolvedValue(true);
    await expect(s.store.store({ message: text(), from, event: delivered })).resolves.toBe('skipped');
    expect(s.manual.attach).not.toHaveBeenCalled();
  });

  it('the status event reaches the attach (its status and time)', async () => {
    const s = setup();
    await s.store.store({ message: text(), from, event: delivered });
    expect(s.manual.attach).toHaveBeenCalledWith(expect.objectContaining({ event: delivered }));
  });

  it('the echo of ExternalStatus goes through the attach (no echo-only gate)', async () => {
    const s = setup();
    s.manual.attach.mockResolvedValue(true);
    await s.status.echo({ message: text(), ...from });
    expect(s.manual.attach).toHaveBeenCalledOnce();
    expect(s.stored).toHaveLength(0);
  });

  it('no such row: stored as before', async () => {
    const s = setup();
    await expect(s.store.store({ message: text(), from })).resolves.toBe('stored');
    expect(s.stored).toHaveLength(1);
  });

  it('a replayed message whose wamid is held: known, never attached again', async () => {
    const s = setup();
    s.stored.push({ phone_e164: '+966501234567', direction: 'outbound', wa_message_id: 'wamid.APP1' });
    await expect(s.store.store({ message: text(), from })).resolves.toBe('known');
    expect(s.manual.attach).not.toHaveBeenCalled();
  });
});
