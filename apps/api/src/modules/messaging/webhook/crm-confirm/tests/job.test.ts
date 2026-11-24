import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crmFailure, crmMessage } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { CrmConfirmSweepJob } from '@/modules/messaging/webhook/crm-confirm/crm-confirm.job';
import { confirmOf, uncertainRow } from './crm-confirm.fakes';

// docs/19 «Confirming an uncertain send»: the 5-minute sweep when the CRM's webhook was missed.

const NOW = new Date('2026-11-15T20:40:00Z');
const ok = (data: unknown) => ({ status: 200, body: { data } });
const CONTACTS = ok([
  { id: 'p-9', phone: '+2010000000011' },
  { id: 'p-1', phone: '201000000001' },
]);
const CONVERSATIONS = ok([{ id: 'c-1' }]);

const sweep = (rows = [uncertainRow()], ...replies: Parameters<typeof scriptedFetch>) => {
  const f = scriptedFetch(...replies);
  const c = confirmOf(rows, f.fetch);
  return { ...c, f, job: new CrmConfirmSweepJob(c.svc) };
};

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('CrmConfirmSweepJob', () => {
  it('finds the contact by exact E.164, its messages, and attaches the one match as sent', async () => {
    const s = sweep(undefined, CONTACTS, CONVERSATIONS, ok([crmMessage({ status: 'sent' })]));
    await expect(s.job.runOnce(NOW)).resolves.toBe(1);
    expect(s.f.requests.map((r) => r.url.split('/v1/')[1])).toEqual([
      'contacts?search=201000000001',
      'conversations?contact_id=p-1',
      'conversations/c-1/messages?limit=50',
    ]);
    expect(s.repo.attached[0]).toMatchObject({
      waMessageId: 'wamid.crm-1',
      patch: { status: 'sent', sent_at: '2026-11-15T20:27:18.000Z' },
    });
  });

  it('two CRM messages like the row: left uncertain', async () => {
    const twice = ok([crmMessage(), crmMessage({ id: 'cm-2', whatsapp_message_id: 'w.2' })]);
    const s = sweep(undefined, CONTACTS, CONVERSATIONS, twice);
    await expect(s.job.runOnce(NOW)).resolves.toBe(0);
    expect(s.repo.attach).not.toHaveBeenCalled();
  });

  it('a row younger than 2 min waits for its webhook; no row: no CRM call', async () => {
    const young = sweep([uncertainRow({ created_at: '2026-11-15T20:39:00.000Z' })]);
    await expect(young.job.runOnce(NOW)).resolves.toBe(0);
    const none = sweep([]);
    await expect(none.job.runOnce(NOW)).resolves.toBe(0);
    expect([...young.f.requests, ...none.f.requests]).toHaveLength(0);
  });

  it('a 403 is logged once per process and stops the pass', async () => {
    const rows = [uncertainRow(), uncertainRow({ id: 'm2', phone_e164: '+201000000002' })];
    const s = sweep(rows, crmFailure(403, 'forbidden'), crmFailure(403, 'forbidden'));
    await expect(s.job.runOnce(NOW)).resolves.toBe(0);
    await expect(s.job.runOnce(NOW)).resolves.toBe(0);
    expect(s.f.requests).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'CRM key lacks contacts:read: uncertain sends are not confirmed',
    );
  });

  it('a 429 skips the pass: nothing written, nothing thrown', async () => {
    const rows = [uncertainRow(), uncertainRow({ id: 'm2', phone_e164: '+201000000002' })];
    const s = sweep(rows, crmFailure(429, 'rate_limited'));
    await expect(s.job.runOnce(NOW)).resolves.toBe(0);
    expect(s.f.requests).toHaveLength(1);
    expect(s.repo.attach).not.toHaveBeenCalled();
  });

  it('at most 10 rows a pass', async () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      uncertainRow({ id: `m${String(i)}`, phone_e164: `+2010000001${String(i).padStart(2, '0')}` }),
    );
    const s = sweep(rows, ...rows.map(() => ok([])));
    await s.job.runOnce(NOW);
    expect(s.f.requests).toHaveLength(10);
  });

  it('the next pass tries the rows the last one did not reach first', async () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      uncertainRow({ id: `m${String(i)}`, phone_e164: `+2010000001${String(i).padStart(2, '0')}` }),
    );
    const s = sweep(rows, ...Array.from({ length: 20 }, () => ok([])));
    await s.job.runOnce(NOW);
    await s.job.runOnce(new Date(NOW.getTime() + 300_000));
    const searched = s.f.requests.slice(10).map((r) => r.url.split('search=')[1]);
    expect(searched.slice(0, 2)).toEqual(['201000000110', '201000000111']);
  });
});
