import { describe, expect, it } from 'vitest';
import { EVOLUTION_SEND_ERROR } from '@/modules/messaging/numbers';
import { parseEvolution } from './webhook.evolution';

// Review fix 3: Evolution's MESSAGES_UPDATE carries no WhatsApp code (no messageStubParameters).
// The real signal is an ERROR status on one of OUR sends (fromMe true): that row fails
// `evolution_error`; the restriction counts them per number.

const NOW = new Date('2026-11-06T10:00:00Z');
const where = { line: 'chat' as const, numberId: 'num-evo', phoneNumberId: 'secondary-1' };
const at = { now: NOW, where, instance: 'secondary-1' };
const update = (data: Record<string, unknown>) =>
  ({ event: 'MESSAGES_UPDATE', instance: 'secondary-1', data: { keyId: 'EVO-OUT-1', ...data } });

const statuses = (body: unknown) => {
  const d = parseEvolution(body, at);
  return d?.kind === 'status' ? d.events : [];
};

describe('parseEvolution — an ERROR on our send', () => {
  it('ERROR with fromMe true fails the row as evolution_error', () => {
    const [a] = statuses(update({ status: 'ERROR', fromMe: true }));
    expect(a).toMatchObject({ waMessageId: 'EVO-OUT-1', status: 'failed', errorCode: EVOLUTION_SEND_ERROR });
    expect(a?.errorText).toContain('ERROR');
  });

  it('an ERROR not marked ours (fromMe false or absent) is not read', () => {
    expect(statuses(update({ status: 'ERROR', fromMe: false }))).toEqual([]);
    expect(statuses(update({ status: 'ERROR' }))).toEqual([]);
  });

  it('a tick never carries a code; stub parameters are ignored', () => {
    const tick = statuses(update({ status: 'DELIVERY_ACK', fromMe: true, messageStubParameters: ['463'] }));
    expect(tick[0]).toMatchObject({ status: 'delivered', errorCode: null });
    expect(statuses(update({ status: 'READ', fromMe: true }))[0]?.status).toBe('read');
  });
});
