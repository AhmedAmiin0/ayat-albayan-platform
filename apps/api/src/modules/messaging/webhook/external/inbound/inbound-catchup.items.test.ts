import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import { kapsoChatNumbers } from '@/modules/messaging/webhook/external/kapso-numbers';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { catchUpRig, FAMILY_WA, GAP_TS, kapsoInbound, NOW, page } from './inbound.fakes';

// Finding 2 of PR #452: a failing item, read stamp or Kapso read never loses the rest.

const RUN = { now: NOW, full: false };
const OTHER_WA = '966509876543';
const chat = () => {
  const [n] = kapsoChatNumbers();
  if (!n) throw new Error('no kapso chat number');
  return n;
};
const at = (s: number) => String(Number(GAP_TS) + s);
const text = (id: string, s = 0, from = FAMILY_WA) =>
  kapsoInbound({ id, from, timestamp: at(s), kapso: { direction: 'inbound', phone_number: `+${from}` } });
const ids = (x: ReturnType<typeof catchUpRig>) => x.queries.stored.map((r) => r.wa_message_id);

/** handle() throws for this wamid (a DB error), runs normally for every other. */
function failOn(x: ReturnType<typeof catchUpRig>, wamid: string) {
  const handle = x.inbound.handle.bind(x.inbound);
  vi.spyOn(x.inbound, 'handle').mockImplementation(async (e: InboundEvent, o) => {
    if (e.waMessageId === wamid) throw new Error(`db: insert failed for +${FAMILY_WA} السلام عليكم`);
    return handle(e, o);
  });
}

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('InboundCatchUp — per-item isolation', () => {
  it('one failing wamid is counted and logged by its tail only; the others are stored', async () => {
    const x = catchUpRig();
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    failOn(x, 'wamid.HBgMOTY2X2');
    x.kapso.inbound.mockResolvedValue(page([text('wamid.C', 2), text('wamid.HBgMOTY2X2', 1), text('wamid.A')]));
    const counts = await x.catchUp.number(chat(), RUN);
    expect(counts).toMatchObject({ stored: 2, failed: 1, complete: false });
    expect(ids(x)).toEqual(['wamid.A', 'wamid.C']);
    const logged = error.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('…Y2X2 failed (Error)');
    for (const secret of ['wamid.HBgMOTY2X2', FAMILY_WA, 'السلام']) expect(logged).not.toContain(secret);
  });

  it('read stamps run for every stored phone even when an item or one stamp fails', async () => {
    const x = catchUpRig();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    failOn(x, 'wamid.BAD');
    const reply = new Date(NOW.getTime() - 60_000);
    x.repo.lastExternalReply.mockImplementation(async (phone: string) => {
      if (phone === `+${OTHER_WA}`) throw new Error('db: timeout');
      return reply;
    });
    x.kapso.inbound.mockResolvedValue(page([text('wamid.BAD', 3), text('wamid.B', 2, OTHER_WA), text('wamid.A')]));
    expect(await x.catchUp.number(chat(), RUN)).toMatchObject({ stored: 2, failed: 1 });
    expect(x.ext.markAnsweredRead).toHaveBeenCalledWith(`+${FAMILY_WA}`, reply, reply);
    expect(x.queries.stored.find((r) => r.wa_message_id === 'wamid.A')?.read_at).toBe(reply.toISOString());
  });

  it('a Kapso error on a later page: nothing applied, the run is incomplete', async () => {
    const x = catchUpRig();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    x.kapso.inbound.mockResolvedValueOnce(page([text('wamid.B', 1)], 'c1'));
    x.kapso.inbound.mockRejectedValueOnce(new Error('WhatsApp HTTP 429'));
    expect(await x.catchUp.number(chat(), RUN)).toMatchObject({ stored: 0, complete: false });
    expect(x.queries.stored).toHaveLength(0);
  });

  it('a clean, uncapped run is complete', async () => {
    const x = catchUpRig();
    x.kapso.inbound.mockResolvedValue(page([text('wamid.A')]));
    const counts = await x.catchUp.number(chat(), RUN);
    expect(counts).toMatchObject({ stored: 1, failed: 0, complete: true });
  });
});

describe('InboundCatchUp — order across pages (Kapso lists newest first)', () => {
  it('every page is read first, then all applied oldest first; a same-second pair in order', async () => {
    const x = catchUpRig();
    const older = page([text('wamid.A2', 1), text('wamid.A1', 1), text('wamid.A0', 0)]);
    const newer = page([text('wamid.D', 3), text('wamid.C', 2)], 'c1');
    const pages = async (_e: unknown, q: { after?: string }) => (q.after ? older : newer);
    x.kapso.inbound.mockImplementation(pages);
    await x.catchUp.number(chat(), RUN);
    expect(ids(x)).toEqual(['wamid.A0', 'wamid.A1', 'wamid.A2', 'wamid.C', 'wamid.D']);
  });
});
