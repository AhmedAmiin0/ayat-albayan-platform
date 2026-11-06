import type { TablesInsert } from '@ab/db';
import { describe, expect, it } from 'vitest';
import { fakeQueries } from '@/modules/messaging/webhook/webhook.fakes';
import { externalServices, kapsoText } from './external.fakes';

// «أرسل عبر واتساب» (owner 2026-11-06): an app echo of the text staff marked is attached to that
// row (ManualEcho), never a second bubble; anything else is stored as before.

const from = { line: 'chat' as const, numberId: 'num-chat' };
const echoText = () => kapsoText({ id: 'wamid.APP1', kapso: undefined });

function setup() {
  const queries = fakeQueries();
  const stored: TablesInsert<'messages'>[] = queries.stored;
  return { ...externalServices(queries), stored };
}

describe('ExternalStore: an echo of a «أرسل عبر واتساب» text', () => {
  it('attached: known, no new row, the chat is answered, no in-flight read', async () => {
    const s = setup();
    s.manual.attach.mockResolvedValue(true);
    await expect(s.store.store({ message: echoText(), from, echo: true })).resolves.toBe('known');
    expect(s.manual.attach).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+966501234567', from: { line: 'chat', numberId: 'num-chat' } }),
    );
    expect(s.stored).toHaveLength(0);
    expect(s.ext.markAnsweredRead).toHaveBeenCalled();
    expect(s.ext.inFlight).not.toHaveBeenCalled();
  });

  it('no such row: stored as before', async () => {
    const s = setup();
    await expect(s.store.store({ message: echoText(), from, echo: true })).resolves.toBe('stored');
    expect(s.stored).toHaveLength(1);
  });

  it('not an echo (Kapso inbox status, catch-up): never attached', async () => {
    const s = setup();
    await s.store.store({ message: echoText(), from });
    expect(s.manual.attach).not.toHaveBeenCalled();
  });

  it('a replayed echo whose wamid is held: known, never attached again', async () => {
    const s = setup();
    s.stored.push({ phone_e164: '+966501234567', direction: 'outbound', wa_message_id: 'wamid.APP1' });
    await expect(s.store.store({ message: echoText(), from, echo: true })).resolves.toBe('known');
    expect(s.manual.attach).not.toHaveBeenCalled();
  });
});
