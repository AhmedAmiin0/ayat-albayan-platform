import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { crmFailure, crmMessage } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { CRM_PLACES, confirmOf, uncertainRow } from './crm-confirm.fakes';

// docs/19 «Confirming an uncertain send»: the CRM's status for a wamid no row holds (incident
// 2026-11-15: the CRM sent it 18 s after our 15 s abort).

const ok = (data: unknown) => ({ status: 200, body: { data } });
const CONVERSATION = ok({ id: 'c-1', contact: { phone: '201000000001' } });
const event = (over: Partial<StatusEvent> = {}): StatusEvent => ({
  waMessageId: 'wamid.crm-1',
  status: 'delivered',
  at: new Date('2026-11-15T20:27:30Z'),
  errorCode: null,
  errorText: null,
  conversationId: null,
  pricingCategory: null,
  crm: { conversationId: 'c-1' },
  ...over,
});

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-15T20:30:00Z'), toFake: ['Date'] });
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CrmConfirm.adopt', () => {
  it('no uncertain crm row: no CRM call at all', async () => {
    const f = scriptedFetch();
    const { svc, repo } = confirmOf([], f.fetch);
    await expect(svc.adopt(event())).resolves.toBe(false);
    expect(repo.uncertain).toHaveBeenCalledTimes(1);
    expect(f.requests).toHaveLength(0);
  });

  it('an uncertain row on another driver only: no CRM call', async () => {
    const f = scriptedFetch();
    const { svc } = confirmOf([uncertainRow({ line: 'chat' })], f.fetch);
    await expect(svc.adopt(event())).resolves.toBe(false);
    expect(f.requests).toHaveLength(0);
  });

  it('nothing on crm, or no CRM conversation id: not even the read', async () => {
    const f = scriptedFetch();
    const off = confirmOf([uncertainRow()], f.fetch, { ...CRM_PLACES, env: null });
    await expect(off.svc.adopt(event())).resolves.toBe(false);
    expect(off.repo.uncertain).not.toHaveBeenCalled();
    const bare = confirmOf([uncertainRow()], f.fetch);
    await expect(bare.svc.adopt(event({ crm: { conversationId: null } }))).resolves.toBe(false);
    expect(bare.repo.uncertain).not.toHaveBeenCalled();
  });

  it('the one matching row gets the wamid, the event status and the CRM time', async () => {
    const f = scriptedFetch(
      ok([crmMessage({ id: 'x', whatsapp_message_id: 'w.2', template_name: 'other' }), crmMessage()]),
      CONVERSATION,
    );
    const { svc, repo } = confirmOf([uncertainRow()], f.fetch);
    await expect(svc.adopt(event())).resolves.toBe(true);
    expect(repo.attached).toEqual([
      {
        row: uncertainRow(),
        waMessageId: 'wamid.crm-1',
        patch: {
          status: 'delivered',
          sent_at: '2026-11-15T20:27:18.000Z',
          delivered_at: '2026-11-15T20:27:30.000Z',
        },
      },
    ]);
  });

  it('two look-alike rows, or a wamid the CRM does not list: left as they are', async () => {
    const twin = scriptedFetch(ok([crmMessage()]), CONVERSATION);
    const two = confirmOf([uncertainRow(), uncertainRow({ id: 'm2' })], twin.fetch);
    await expect(two.svc.adopt(event())).resolves.toBe(false);
    expect(two.repo.attach).not.toHaveBeenCalled();
    const gone = scriptedFetch(ok([crmMessage({ whatsapp_message_id: 'w.9' })]));
    const none = confirmOf([uncertainRow()], gone.fetch);
    await expect(none.svc.adopt(event())).resolves.toBe(false);
    expect(gone.requests).toHaveLength(1);
  });

  it('a failed status never attaches; a refused key is said once and never throws', async () => {
    const f = scriptedFetch(ok([crmMessage()]), CONVERSATION);
    const failed = confirmOf([uncertainRow()], f.fetch);
    await expect(failed.svc.adopt(event({ status: 'failed' }))).resolves.toBe(false);
    expect(failed.repo.attach).not.toHaveBeenCalled();
    const refused = scriptedFetch(crmFailure(403, 'forbidden'), crmFailure(403, 'forbidden'));
    const { svc } = confirmOf([uncertainRow()], refused.fetch);
    await expect(svc.adopt(event())).resolves.toBe(false);
    await expect(svc.adopt(event())).resolves.toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'CRM key lacks messages:read: uncertain sends are not confirmed',
    );
  });

  it('a second CRM message like the row (a resend from the dashboard): left as is', async () => {
    const twin = crmMessage({ id: 'cm-2', whatsapp_message_id: 'w.2' });
    const f = scriptedFetch(ok([twin, crmMessage()]), CONVERSATION);
    const { svc, repo } = confirmOf([uncertainRow()], f.fetch);
    await expect(svc.adopt(event())).resolves.toBe(false);
    expect(repo.attach).not.toHaveBeenCalled();
  });

  it('lost to a concurrent status of the same wamid: true, so the status path moves it', async () => {
    const f = scriptedFetch(ok([crmMessage()]), CONVERSATION);
    const { svc, repo } = confirmOf([uncertainRow()], f.fetch);
    repo.attach.mockResolvedValueOnce(false);
    repo.held.mockResolvedValueOnce(new Set()).mockResolvedValueOnce(new Set(['wamid.crm-1']));
    await expect(svc.adopt(event())).resolves.toBe(true);
  });

  it('a full read (500 uncertain rows) is not trusted: no CRM call', async () => {
    const f = scriptedFetch();
    const { svc, repo } = confirmOf([], f.fetch);
    repo.uncertain.mockResolvedValueOnce(Array.from({ length: 500 }, () => uncertainRow()));
    await expect(svc.adopt(event())).resolves.toBe(false);
    expect(f.requests).toHaveLength(0);
  });
});
