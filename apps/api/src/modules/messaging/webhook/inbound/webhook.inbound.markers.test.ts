import { describe, expect, it, vi } from 'vitest';
import { event, services } from '@/modules/messaging/webhook/webhook.fakes';
import type { ReactionOutcome } from './webhook.reaction';

// A family's edit, revoke or reaction (webhook, and the inbound catch-up, which calls the same
// handle): never a new bubble, lead, push or unread. An edit or revoke, or a reaction whose message
// is not stored yet, is a hidden marker row the database applies (migration 992).

const ORIGINAL = 'wamid.FAMILY1';
const edit = event({
  waMessageId: 'wamid.E1',
  type: 'edit',
  body: null,
  payload: {
    type: 'edit',
    edit: { original_message_id: ORIGINAL, message: { text: { body: 'غدًا 5' } } },
  },
});
const revoke = event({
  waMessageId: 'wamid.V1',
  type: 'revoke',
  body: null,
  payload: { type: 'revoke', revoke: { original_message_id: ORIGINAL } },
});
const reaction = event({
  waMessageId: 'wamid.R1',
  type: 'reaction',
  body: null,
  payload: { type: 'reaction', reaction: { message_id: 'wamid.OURS', emoji: '❤️' } },
});

function withReactions(outcome: ReactionOutcome) {
  const s = services();
  const apply = vi.fn(async () => outcome);
  Object.assign(s.inbound, { reactions: { apply } });
  return { s, apply };
}

describe('InboundService — markers', () => {
  it('an edit is a read marker row naming the original and its text; no lead, no push', async () => {
    const s = services();
    expect(await s.inbound.handle(edit)).toBe(false);
    expect(s.queries.stored).toEqual([
      expect.objectContaining({
        direction: 'inbound',
        wa_message_id: 'wamid.E1',
        body: null,
        lead_id: null,
        interactive_payload: { type: 'edit', marker: true, target: ORIGINAL, text: 'غدًا 5' },
      }),
    ]);
    expect(s.queries.stored[0]?.read_at).toBe(edit.at.toISOString());
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
    expect(s.push.notifySales).not.toHaveBeenCalled();
  });

  it('a revoke is a marker; a replay stores nothing twice', async () => {
    const s = services();
    await s.inbound.handle(revoke);
    await s.inbound.handle(revoke);
    expect(s.queries.stored).toHaveLength(1);
    expect(s.queries.stored[0]?.interactive_payload).toEqual({
      type: 'revoke',
      marker: true,
      target: ORIGINAL,
    });
  });

  it('a reaction on a stored message is a column only: no row', async () => {
    const { s, apply } = withReactions('applied');
    expect(await s.inbound.handle(reaction)).toBe(false);
    expect(apply).toHaveBeenCalledOnce();
    expect(s.queries.stored).toEqual([]);
  });

  it('a reaction whose message is not stored yet is kept as a pending marker', async () => {
    const { s } = withReactions('unknown');
    await s.inbound.handle(reaction);
    expect(s.queries.stored).toEqual([
      expect.objectContaining({
        wa_message_id: 'wamid.R1',
        interactive_payload: expect.objectContaining({
          type: 'reaction',
          marker: true,
          target: 'wamid.OURS',
        }),
      }),
    ]);
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('an unusable reaction (not an emoji) leaves nothing', async () => {
    const { s } = withReactions('ignored');
    await s.inbound.handle(reaction);
    expect(s.queries.stored).toEqual([]);
  });
});
