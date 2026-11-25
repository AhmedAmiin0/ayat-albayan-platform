import { describe, expect, it } from 'vitest';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { CRM_ENV, crmFailure, crmMessage } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { crmLookup, CrmLookupError, type LookupFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm-lookup';

// docs/19 «Confirming an uncertain send»: the CRM's read-only lookups. No network.

const BASE = 'http://127.0.0.1:4010/crm/api/v1';
const ok = (data: unknown) => ({ status: 200, body: { data } });

async function failureOf(p: Promise<unknown>): Promise<LookupFailure> {
  const e = await p.then(
    () => null,
    (x: unknown) => x,
  );
  if (!(e instanceof CrmLookupError)) throw new Error('expected a CrmLookupError');
  return e.failure;
}

describe('crmLookup', () => {
  it('reads a conversation and its newest 50 messages with the Bearer key', async () => {
    const f = scriptedFetch(
      ok({ id: 'c-1', contact: { phone: '201000000001', name: 'x' } }),
      ok([crmMessage(), { id: 'odd' }]),
    );
    const lookup = crmLookup(CRM_ENV, f.fetch);
    await expect(lookup.conversation('c-1')).resolves.toMatchObject({
      contact: { phone: '201000000001' },
    });
    const items = await lookup.messages('c-1');
    expect(items).toHaveLength(1);
    expect(items[0]?.created_at).toEqual(new Date('2026-11-15T20:27:18.000Z'));
    expect(f.requests.map((r) => r.url)).toEqual([
      `${BASE}/conversations/c-1`,
      `${BASE}/conversations/c-1/messages?limit=50`,
    ]);
    expect(f.requests[0]?.init.method).toBe('GET');
    expect(f.requests[0]?.init.headers).toMatchObject({ authorization: 'Bearer fake-crm-key' });
  });

  it('reads one contact by its id: phone and name (the inbound mirror)', async () => {
    const f = scriptedFetch(ok({ id: 'p-1', phone: '966500000001', name: 'أم أحمد', tags: [] }));
    const lookup = crmLookup(CRM_ENV, f.fetch);
    await expect(lookup.contact('p-1')).resolves.toEqual({
      id: 'p-1',
      phone: '966500000001',
      name: 'أم أحمد',
    });
    expect(f.requests.map((r) => r.url)).toEqual([`${BASE}/contacts/p-1`]);
  });

  it('finds contacts by digits and their conversations', async () => {
    const f = scriptedFetch(ok([{ id: 'p-1', phone: '+201000000001' }]), ok([{ id: 'c-1' }]));
    const lookup = crmLookup(CRM_ENV, f.fetch);
    await expect(lookup.contacts('201000000001')).resolves.toHaveLength(1);
    await expect(lookup.conversationsOf('p-1')).resolves.toEqual(['c-1']);
    expect(f.requests.map((r) => r.url)).toEqual([
      `${BASE}/contacts?search=201000000001`,
      `${BASE}/conversations?contact_id=p-1`,
    ]);
  });

  it('a 403 is the missing scope (named or the call own); 401 too', async () => {
    const named = scriptedFetch(crmFailure(403, 'forbidden', "missing the 'messages:read' scope"));
    await expect(failureOf(crmLookup(CRM_ENV, named.fetch).messages('c-1'))).resolves.toEqual({
      kind: 'scope',
      scope: 'messages:read',
    });
    const plain = scriptedFetch(crmFailure(401, 'unauthorized'));
    await expect(failureOf(crmLookup(CRM_ENV, plain.fetch).contacts('2010'))).resolves.toEqual({
      kind: 'scope',
      scope: 'contacts:read',
    });
  });

  it('a 429, a 5xx, a network error or an odd answer skips', async () => {
    const f = scriptedFetch(
      crmFailure(429, 'rate_limited'),
      crmFailure(500, 'internal'),
      new Error('socket hang up'),
      ok({ nope: true }),
    );
    const lookup = crmLookup(CRM_ENV, f.fetch);
    for (let i = 0; i < 4; i++) {
      await expect(failureOf(lookup.conversation('c-1'))).resolves.toMatchObject({ kind: 'skip' });
    }
  });
});
