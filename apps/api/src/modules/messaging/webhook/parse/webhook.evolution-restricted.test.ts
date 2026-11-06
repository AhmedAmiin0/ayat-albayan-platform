import { describe, expect, it } from 'vitest';
import { EVOLUTION_RESTRICTED, parseEvolution } from './webhook.evolution';

// Field report (docs/19 «Evolution driver»): WhatsApp's 463 / 475 refusal comes LATER, as a
// MESSAGES_UPDATE status ERROR with messageStubParameters, after Evolution accepted the send.

const NOW = new Date('2026-11-06T10:00:00Z');
const where = { line: 'chat' as const, numberId: 'num-evo', phoneNumberId: 'secondary-1' };
const at = { now: NOW, where, instance: 'secondary-1' };
const update = (data: Record<string, unknown>) =>
  ({ event: 'MESSAGES_UPDATE', instance: 'secondary-1', data: { keyId: 'EVO-OUT-1', fromMe: true, ...data } });

const statuses = (body: unknown) => {
  const d = parseEvolution(body, at);
  return d?.kind === 'status' ? d.events : [];
};

describe('parseEvolution — a late restriction', () => {
  it('ERROR with 463 (or 475, top level or under update) fails the row as evolution_restricted', () => {
    const [a] = statuses(update({ status: 'ERROR', messageStubParameters: ['463'] }));
    expect(a).toMatchObject({ waMessageId: 'EVO-OUT-1', status: 'failed', errorCode: EVOLUTION_RESTRICTED });
    expect(a?.errorText).toContain('463');
    const [b] = statuses(update({ status: 'ERROR', update: { messageStubParameters: [475] } }));
    expect(b?.errorCode).toBe(EVOLUTION_RESTRICTED);
  });

  it('a plain ERROR or another code is a plain failure; a tick never carries a code', () => {
    expect(statuses(update({ status: 'ERROR' }))[0]).toMatchObject({ status: 'failed', errorCode: null });
    expect(statuses(update({ status: 'ERROR', messageStubParameters: ['479'] }))[0]?.errorCode).toBeNull();
    expect(statuses(update({ status: 'DELIVERY_ACK', messageStubParameters: ['463'] }))[0]?.errorCode).toBeNull();
  });

  it('an odd stub list never breaks the tick', () => {
    expect(statuses(update({ status: 'READ', messageStubParameters: { x: 1 } }))[0]?.status).toBe('read');
  });
});
