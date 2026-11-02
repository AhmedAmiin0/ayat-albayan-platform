import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { FLOOR } from '@/modules/messaging/webhook/external/external-catchup.job';
import { KAPSO_NUMBER_ID, kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import { kapsoChatNumbers } from '@/modules/messaging/webhook/external/kapso-numbers';
import { event } from '@/modules/messaging/webhook/webhook.fakes';
import { MAX_PAGES } from './inbound-catchup.service';
import { LATE_MS, MAX_BACK_MS } from './inbound-history';
import { catchUpRig, FAMILY_WA, GAP_AT, GAP_TS, kapsoInbound, NOW, page } from './inbound.fakes';

const RUN = { now: NOW, full: false };
const chat = () => {
  const [n] = kapsoChatNumbers();
  if (!n) throw new Error('no kapso chat number');
  return n;
};
const ts = (at: Date) => String(at.getTime() / 1000);
const ago = (ms: number) => ts(new Date(NOW.getTime() - ms));

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('InboundCatchUp — rows', () => {
  it('stores each missing family message once, oldest first, as the webhook row', async () => {
    const x = catchUpRig();
    const later = kapsoInbound({ id: 'wamid.IN2', timestamp: String(Number(GAP_TS) + 60) });
    x.kapso.inbound.mockResolvedValue(page([later, kapsoInbound()]));
    expect(await x.catchUp.number(chat(), RUN)).toMatchObject({ listed: 2, stored: 2, late: 2 });
    expect(x.queries.stored.map((r) => r.wa_message_id)).toEqual(['wamid.IN1', 'wamid.IN2']);
    expect(x.queries.stored[0]).toMatchObject({
      direction: 'inbound',
      status: 'delivered',
      phone_e164: `+${FAMILY_WA}`,
      line: 'chat',
      number_id: KAPSO_NUMBER_ID,
      created_at: GAP_AT.toISOString(),
    });
    expect(x.queries.stored[0]?.read_at).toBeUndefined(); // unread, as from the webhook
    // Back-filled: the lead's follow-up cycle starts now, not at the old message (owner).
    expect(x.leads.upsertByPhone).toHaveBeenCalledWith(expect.objectContaining({ at: NOW }));
    const again = await x.catchUp.number(chat(), RUN);
    expect(again).toMatchObject({ stored: 0, known: 2 });
    expect(x.queries.stored).toHaveLength(2);
  });

  it('a webhook delivery racing the catch-up: one row, one push, counted known', async () => {
    const x = catchUpRig();
    x.ext.existing.mockResolvedValueOnce(new Set()); // checked before the webhook stored it
    await x.inbound.handle(event({ waMessageId: 'wamid.IN1', at: GAP_AT }));
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound()]));
    expect(await x.catchUp.number(chat(), RUN)).toMatchObject({ stored: 0, known: 1 });
    expect(x.queries.stored.filter((r) => r.wa_message_id === 'wamid.IN1')).toHaveLength(1);
    expect(x.push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('reaction, sticker and image items go through the webhook path', async () => {
    const x = catchUpRig();
    const apply = vi.fn().mockResolvedValue(undefined);
    Object.assign(x.inbound, { reactions: { apply } });
    const reaction = { message_id: 'wamid.OUT9', emoji: '👍' };
    const sticker = { id: 'st-1', mime_type: 'image/webp' };
    const image = { id: 'img-1', mime_type: 'image/jpeg' };
    x.kapso.inbound.mockResolvedValue(page([ // Kapso lists newest first
      kapsoInbound({ id: 'wamid.I', type: 'image', text: undefined, image }),
      kapsoInbound({ id: 'wamid.S', type: 'sticker', text: undefined, sticker }),
      kapsoInbound({ id: 'wamid.R', type: 'reaction', text: undefined, reaction }),
    ]));
    await x.catchUp.number(chat(), RUN);
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ waMessageId: 'wamid.R' }), `+${FAMILY_WA}`);
    expect(x.queries.stored.map((r) => [r.wa_message_id, r.media_id])).toEqual([
      ['wamid.S', 'st-1'],
      ['wamid.I', 'img-1'],
    ]);
  });

  it('outbound items in the listing are skipped, never stored as inbound', async () => {
    const x = catchUpRig();
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ kapso: { direction: 'outbound' } })]));
    const counts = await x.catchUp.number(chat(), RUN);
    expect(counts).toMatchObject({ listed: 1, skipped: 1, stored: 0 });
    expect(x.queries.stored).toHaveLength(0);
  });
});

describe('InboundCatchUp — notifications (the 15-minute rule)', () => {
  it('older than 15 min when stored: row and unread only, no admin or sales push', async () => {
    const x = catchUpRig();
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ timestamp: ago(LATE_MS + 1000) })]));
    expect(await x.catchUp.number(chat(), RUN)).toMatchObject({ stored: 1, late: 1 });
    expect(x.push.notifyAdmins).not.toHaveBeenCalled();
    expect(x.push.notifySales).not.toHaveBeenCalled();
  });

  it('a fresh one (5 min) pushes exactly like a webhook message', async () => {
    const x = catchUpRig();
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ timestamp: ago(300_000) })]));
    expect(await x.catchUp.number(chat(), RUN)).toMatchObject({ stored: 1, late: 0 });
    expect(x.push.notifyAdmins).toHaveBeenCalledWith('new_lead', expect.anything());
    expect(x.push.notifySales).toHaveBeenCalledTimes(1);
  });

  it('a message staff already answered from Kapso inbox is stamped read', async () => {
    const x = catchUpRig();
    const reply = new Date(GAP_AT.getTime() + 120_000);
    x.repo.lastExternalReply.mockResolvedValue(reply);
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound()]));
    await x.catchUp.number(chat(), RUN);
    expect(x.ext.markAnsweredRead).toHaveBeenCalledWith(`+${FAMILY_WA}`, reply, reply);
    expect(x.queries.stored[0]?.read_at).toBe(reply.toISOString());
  });
});

describe('InboundCatchUp — window, paging, errors', () => {
  it('since the newest inbound row; follows the cursor', async () => {
    const x = catchUpRig();
    x.repo.newestInbound.mockResolvedValue(new Date('2026-10-28T08:49:00Z'));
    x.kapso.inbound.mockImplementation(async (_env, q: { after?: string }) =>
      q.after ? page([kapsoInbound({ id: 'wamid.P2' })]) : page([kapsoInbound({ id: 'wamid.P1' })], 'c1'));
    await x.catchUp.number(chat(), RUN);
    expect(x.repo.newestInbound).toHaveBeenCalledWith({ line: 'chat', numberId: KAPSO_NUMBER_ID });
    const since = '2026-10-28T08:49:00.000Z';
    expect(x.kapso.inbound.mock.calls.map((c) => c[1])).toEqual([{ since }, { since, after: 'c1' }]);
    expect(x.queries.stored).toHaveLength(2);
  });

  it(`never before FLOOR (7 days at most), and stops after ${MAX_PAGES} pages`, async () => {
    const x = catchUpRig();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    x.repo.newestInbound.mockResolvedValue(new Date('2026-09-01T00:00:00Z'));
    let n = 0;
    x.kapso.inbound.mockImplementation(async () => page([kapsoInbound({ id: `wamid.${n++}` })], 'more'));
    await x.catchUp.number(chat(), RUN);
    expect(x.kapso.inbound).toHaveBeenCalledTimes(MAX_PAGES);
    expect(new Date(NOW.getTime() - MAX_BACK_MS) < FLOOR).toBe(true);
    expect(x.kapso.inbound.mock.calls[0]?.[1]).toEqual({ since: FLOOR.toISOString() });
  });

  it('a Kapso error ends the run with the counts so far; never throws', async () => {
    const x = catchUpRig();
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    x.kapso.inbound.mockRejectedValue(new Error('WhatsApp HTTP 502'));
    const done = x.catchUp.number(chat(), RUN);
    await expect(done).resolves.toMatchObject({ listed: 0, stored: 0, complete: false });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('stopped: WhatsApp HTTP 502'));
  });
});
