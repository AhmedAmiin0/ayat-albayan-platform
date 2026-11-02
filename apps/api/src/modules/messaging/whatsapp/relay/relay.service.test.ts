import { describe, expect, it } from 'vitest';
import { CRM_SENT, crmFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { crmMe, fakeLine, fakeRepo, KEY, templateBody, TO } from './relay.fakes';
import type { RelayRepo } from './relay.repo';
import { relayRequestSchema } from './relay.schema';
import { RelayService } from './relay.service';

// Row first, then the existing crm driver; duplicates replay the first row, nothing sent twice.

const NOW = new Date('2026-11-01T08:00:00Z');

function setup(...replies: Parameters<typeof scriptedFetch>) {
  const f = scriptedFetch(...replies);
  const repo = fakeRepo();
  const line = fakeLine({ fetch: f });
  const service = new RelayService(line, repo as unknown as RelayRepo);
  const now = line.current();
  if (!now) throw new Error('line');
  return { f, repo, service, now };
}

const req = relayRequestSchema.parse(templateBody());

describe('RelayService', () => {
  it('stores one notifications row with a readable body, no lead or staff, then sends; ids back', async () => {
    const s = setup(CRM_SENT);
    await expect(s.service.send(s.now, req, NOW)).resolves.toEqual({
      message_id: 'row-1',
      whatsapp_message_id: 'wamid.crm-1',
    });
    expect(s.repo.rows).toEqual([
      expect.objectContaining({
        phone: TO,
        body: '[teacher_lesson_reminder]\nسارة\n17:00',
        status: 'sent',
        waMessageId: 'wamid.crm-1',
      }),
    ]);
    expect(s.repo.rows[0]).not.toHaveProperty('leadId');
    expect(s.f.requests[0]?.body).toMatchObject({
      to: TO,
      type: 'template',
      template: { name: 'teacher_lesson_reminder' },
    });
  });

  it('a retry inside the window returns the first row and sends nothing', async () => {
    const s = setup(CRM_SENT);
    await s.service.send(s.now, req, NOW);
    await expect(s.service.send(s.now, req, new Date('2026-11-01T08:05:00Z'))).resolves.toEqual({
      message_id: 'row-1',
      whatsapp_message_id: 'wamid.crm-1',
    });
    expect(s.f.requests).toHaveLength(1);
    expect(s.repo.rows).toHaveLength(1);
  });

  it('CRM 2xx without a wamid: kept as sent, 201 with the row id', async () => {
    const s = setup({ status: 201, body: { data: { message_id: 'm-1' } } });
    await expect(s.service.send(s.now, req, NOW)).resolves.toEqual({
      message_id: 'row-1',
      whatsapp_message_id: null,
    });
    expect(s.repo.rows[0]?.status).toBe('sent');
  });

  it('a CRM 5xx may have gone: the row is held uncertain and a retry replays it unsent', async () => {
    const s = setup(crmFailure(500, 'internal'));
    await expect(s.service.send(s.now, req, NOW)).rejects.toMatchObject({ status: 502 });
    expect(s.repo.rows[0]).toMatchObject({ status: 'failed', errorCode: 'uncertain' });
    await expect(s.service.send(s.now, req, NOW)).resolves.toEqual({
      message_id: 'row-1',
      whatsapp_message_id: null,
    });
    expect(s.f.requests).toHaveLength(1);
  });

  it("a CRM refusal was never sent: the row goes, so the script's retry sends afresh", async () => {
    const s = setup(crmFailure(429, 'rate_limited'), CRM_SENT);
    await expect(s.service.send(s.now, req, NOW)).rejects.toMatchObject({ status: 429 });
    expect(s.repo.rows).toEqual([]);
    await expect(s.service.send(s.now, req, NOW)).resolves.toMatchObject({
      whatsapp_message_id: 'wamid.crm-1',
    });
  });

  it("authorize: the line's own key without a call; a key the CRM refuses is 401", async () => {
    const s = setup(crmFailure(401, 'unauthorized'));
    await expect(s.service.authorize(KEY)).resolves.toBe(s.now);
    await expect(s.service.authorize('Bearer other')).rejects.toMatchObject({ status: 401 });
    expect(s.f.requests).toHaveLength(1);
  });

  it("authorize: the script's own key of the same CRM account is accepted", async () => {
    const s = setup(crmMe(), crmMe());
    await expect(s.service.authorize('Bearer script-key')).resolves.toBe(s.now);
  });

  it('authorize: the CRM unreachable while checking a key is 502, not 401', async () => {
    const s = setup(new TypeError('fetch failed'));
    await expect(s.service.authorize('Bearer script-key')).rejects.toMatchObject({ status: 502 });
  });
});
