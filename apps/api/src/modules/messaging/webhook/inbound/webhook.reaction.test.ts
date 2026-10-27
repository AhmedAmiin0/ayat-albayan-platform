import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import { event, services } from '../webhook.fakes';
import { InboundReactions } from './webhook.reaction';

// Example numbers only.
const FAMILY = '+966501234567';
const OTHER = '+966501234568';

type Row = { id: string; wa_message_id: string; phone_e164: string; their_reaction: string | null };

/** messages.update(patch).eq(…).eq(…).select('id') over rows in memory; `fail` = the DB answers an error. */
function fakeDb(rows: Row[], fail = false): Db {
  const from = () => ({
    update: (patch: Partial<Row>) => {
      const where: [keyof Row, string][] = [];
      const chain = {
        eq: (k: keyof Row, v: string) => (where.push([k, v]), chain),
        select: async () => {
          if (fail) return { data: null, error: { message: 'db down' } };
          const hit = rows.filter((r) => where.every(([k, v]) => r[k] === v));
          hit.forEach((r) => Object.assign(r, patch));
          return { data: hit.map((r) => ({ id: r.id })), error: null };
        },
      };
      return chain;
    },
  });
  return { from } as unknown as Db;
}

const reaction = (emoji: string | undefined, target = 'wamid.OUT1') =>
  event({ waMessageId: 'wamid.R1', type: 'reaction', body: null, payload: { type: 'reaction', reaction: { message_id: target, ...(emoji === undefined ? {} : { emoji }) } } });

const seeded = (): Row[] => [
  { id: 'm1', wa_message_id: 'wamid.OUT1', phone_e164: FAMILY, their_reaction: null },
  { id: 'm2', wa_message_id: 'wamid.OTHER', phone_e164: OTHER, their_reaction: null },
];

describe('InboundReactions', () => {
  it('sets their_reaction on the named message of the same phone, then clears it on an empty emoji', async () => {
    const rows = seeded();
    const r = new InboundReactions(fakeDb(rows));
    await r.apply(reaction('❤️'), FAMILY);
    expect(rows[0]?.their_reaction).toBe('❤️');
    await r.apply(reaction(''), FAMILY);
    expect(rows[0]?.their_reaction).toBeNull();
    await r.apply(reaction('👍'), FAMILY);
    await r.apply(reaction(undefined), FAMILY);
    expect(rows[0]?.their_reaction).toBeNull();
  });

  it('never touches another chat’s message, and ignores an unknown target or text', async () => {
    const rows = seeded();
    const r = new InboundReactions(fakeDb(rows));
    await r.apply(reaction('👍', 'wamid.OTHER'), FAMILY);
    await r.apply(reaction('👍', 'wamid.NOPE'), FAMILY);
    await r.apply(reaction('hello'), FAMILY);
    expect(rows.map((x) => x.their_reaction)).toEqual([null, null]);
  });

  it('a failed write is logged, never thrown (the webhook answers 200)', async () => {
    await expect(new InboundReactions(fakeDb(seeded(), true)).apply(reaction('👍'), FAMILY)).resolves.toBeUndefined();
  });
});

describe('InboundService — a reaction', () => {
  it('creates no row, no lead and no push, and bumps no unread', async () => {
    const s = services();
    const apply = vi.fn(async () => undefined);
    Object.assign(s.inbound, { reactions: { apply } });
    const m = reaction('👍');
    await s.inbound.handle(m);
    expect(apply).toHaveBeenCalledWith(m, FAMILY);
    expect(s.queries.stored).toEqual([]);
    expect(s.queries.identify).not.toHaveBeenCalled();
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
    expect(s.push.notifySales).not.toHaveBeenCalled();
  });
});
