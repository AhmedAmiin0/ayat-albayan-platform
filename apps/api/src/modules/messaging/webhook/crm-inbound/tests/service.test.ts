import { describe, expect, it, vi } from 'vitest';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { InboundService } from '@/modules/messaging/webhook/inbound/webhook.inbound.service';
import type { CrmInboundRepo } from '@/modules/messaging/webhook/crm-inbound/crm-inbound.repo';
import { CrmInbound, retryAfterMs, type CrmInboundSource } from '@/modules/messaging/webhook/crm-inbound/crm-inbound.service';
import { contactCard, crmItem, MEDIA_LINK, queued, WAMID } from './crm-inbound.fakes';

// A queued CRM message.received into the inbox (owner 2026-11-21). Fakes only: no CRM, no db.

const NOW = new Date('2026-11-21T10:00:00Z');
const ok = (data: unknown) => ({ status: 200, body: { data } });
const down = { status: 503, body: { error: { code: 'internal', message: 'down' } } };

function kit(rows: ReturnType<typeof queued>[], ...replies: Parameters<typeof scriptedFetch>) {
  const f = scriptedFetch(...replies);
  const repo = {
    due: vi.fn(async () => rows),
    done: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    isActiveTeacher: vi.fn(async (_phone: string) => false),
  };
  const inbound = { handle: vi.fn(async () => true) };
  const source: CrmInboundSource = {
    env: () => CRM_ENV,
    place: () => ({ line: 'notifications', numberId: null }),
    fetch: f.fetch,
  };
  const service = new CrmInbound(
    repo as unknown as CrmInboundRepo,
    inbound as unknown as InboundService,
    source,
  );
  return { service, repo, inbound, f, source };
}

describe('CrmInbound.drain', () => {
  it('a text: the contact looked up, handed to the inbound path, the row done', async () => {
    const k = kit([queued()], ok(contactCard()));
    expect(await k.service.drain(NOW)).toBe(1);
    expect(k.f.requests.map((r) => r.url)).toEqual([`${CRM_ENV.base}/contacts/ct-1`]);
    expect(k.inbound.handle).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ waMessageId: WAMID, from: '966500000001', line: 'notifications' }),
    );
    expect(k.repo.done).toHaveBeenCalledExactlyOnceWith(WAMID);
    expect(k.repo.retry).not.toHaveBeenCalled();
  });

  it('a photo: its CRM message read for the link', async () => {
    const k = kit([queued({ content_type: 'image' })], ok(contactCard()), ok([crmItem()]));
    await k.service.drain(NOW);
    expect(k.f.requests[1]?.url).toBe(`${CRM_ENV.base}/conversations/cv-1/messages?limit=50`);
    expect(k.inbound.handle).toHaveBeenCalledWith(
      expect.objectContaining({ body: MEDIA_LINK, mediaMime: 'image/jpeg' }),
    );
  });

  it('a lookup failure keeps the row for later (backoff), never handed, never dropped', async () => {
    const k = kit([queued({ attempts: 2 })], down);
    expect(await k.service.drain(NOW)).toBe(0);
    expect(k.inbound.handle).not.toHaveBeenCalled();
    expect(k.repo.done).not.toHaveBeenCalled();
    expect(k.repo.retry).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        waMessageId: WAMID,
        attempts: 3,
        nextAt: new Date(NOW.getTime() + 240_000),
      }),
    );
  });

  it('no CRM line, a contact with no phone, or a failed inbound write: retried', async () => {
    const k = kit([queued(), queued({ wa_message_id: 'w2' })], ok(contactCard({ phone: null })));
    k.source.env = () => null;
    await k.service.drain(NOW);
    k.source.env = () => CRM_ENV;
    expect(k.repo.retry).toHaveBeenCalledTimes(2);
    const k2 = kit([queued()], ok(contactCard({ phone: null })));
    await k2.service.drain(NOW);
    const k3 = kit([queued()], ok(contactCard()));
    k3.inbound.handle.mockRejectedValueOnce(new Error('db down'));
    await k3.service.drain(NOW);
    expect([k2.repo.retry.mock.calls.length, k3.repo.retry.mock.calls.length]).toEqual([1, 1]);
    expect(k3.repo.done).not.toHaveBeenCalled();
  });

  it('one failure never stops the others', async () => {
    const k = kit([queued({ wa_message_id: 'w1' }), queued()], down, ok(contactCard()));
    expect(await k.service.drain(NOW)).toBe(1);
    expect(k.repo.done).toHaveBeenCalledExactlyOnceWith(WAMID);
  });
});

describe('CrmInbound.drain: teachers use platform chat only (owner 2026-11-22)', () => {
  it("an active teacher's message: the row deleted, never handed to the inbox", async () => {
    const k = kit([queued({ content_type: 'image' })], ok(contactCard()));
    k.repo.isActiveTeacher.mockResolvedValueOnce(true);
    expect(await k.service.drain(NOW)).toBe(0);
    expect(k.repo.isActiveTeacher).toHaveBeenCalledExactlyOnceWith('+966500000001');
    expect(k.f.requests).toHaveLength(1);
    expect(k.inbound.handle).not.toHaveBeenCalled();
    expect(k.repo.done).toHaveBeenCalledExactlyOnceWith(WAMID);
    expect(k.repo.retry).not.toHaveBeenCalled();
  });

  it("an inactive teacher's (or anyone else's) message is mirrored as before", async () => {
    const k = kit([queued()], ok(contactCard()));
    expect(await k.service.drain(NOW)).toBe(1);
    expect(k.repo.isActiveTeacher).toHaveBeenCalledExactlyOnceWith('+966500000001');
    expect(k.inbound.handle).toHaveBeenCalledOnce();
  });
});

describe('retryAfterMs', () => {
  it.each([
    [0, 30_000],
    [1, 60_000],
    [5, 960_000],
    [20, 3_600_000],
  ])('attempt %i waits %i ms (capped at 1 h)', (n, ms) => {
    expect(retryAfterMs(n)).toBe(ms);
  });
});
