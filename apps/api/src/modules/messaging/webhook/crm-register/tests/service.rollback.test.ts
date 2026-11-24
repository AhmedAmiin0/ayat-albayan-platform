import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { endpoint, failure, FAKE_SECRET, IDS, refusal, registrarKit } from './crm-webhook.fakes';

// docs/19 «crm driver» › delivery ticks in one click: a failure after the CRM was asked to create
// leaves the older endpoints as they were and removes only what this press made. No network.

afterEach(() => vi.restoreAllMocks());

const OLD = { 'GET webhooks': { status: 200, body: { data: [endpoint(IDS.old1)] } } };
const deletes = (calls: { method: string; path: string }[]) =>
  calls.filter((c) => c.method === 'DELETE').map((c) => c.path);

describe('CrmWebhookRegistrar.register: rolled back', () => {
  it('create fails: the older endpoints are untouched, nothing stored', async () => {
    const kit = registrarKit({ answers: { ...OLD, 'POST webhooks': failure(500, 'internal') } });
    expect((await refusal(() => kit.registrar.register())).body).toContain('crm_failed');
    expect(deletes(kit.crm.calls)).toEqual([]);
    expect(kit.setSecret).not.toHaveBeenCalled();
  });

  it('a 201 without its secret is crm_bad_answer: only the endpoint it made is removed', async () => {
    const answers = { ...OLD, 'POST webhooks': { status: 201, body: { data: endpoint(IDS.created) } } };
    const kit = registrarKit({ answers });
    expect((await refusal(() => kit.registrar.register())).body).toContain('crm_bad_answer');
    expect(deletes(kit.crm.calls)).toEqual([`webhooks/${IDS.created}`]);
    expect(kit.setSecret).not.toHaveBeenCalled();
  });

  it('a malformed secret never reaches the error (no ZodError dump)', async () => {
    for (const bad of [`not-whsec-${FAKE_SECRET}`, 'whsec_short', `whsec_${'a'.repeat(20)}!`]) {
      const data = { ...endpoint(IDS.created), secret: bad };
      const answers = { 'POST webhooks': { status: 201, body: { data } } };
      const r = await refusal(() => registrarKit({ answers }).registrar.register());
      expect(r.body).toContain('crm_bad_answer');
      expect(r.body).not.toContain(bad);
    }
  });

  it('storing fails: only the new endpoint is removed, 500 secret_store_failed, no secret logged', async () => {
    const spies = (['log', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(Logger.prototype, m).mockImplementation(() => undefined),
    );
    const kit = registrarKit({ answers: OLD });
    kit.setSecret.mockRejectedValue(new Error(`vault refused ${FAKE_SECRET}`));
    const r = await refusal(() => kit.registrar.register());
    expect(r).toMatchObject({ status: 500 });
    expect(r.body).toContain('secret_store_failed');
    expect(r.body).not.toContain(FAKE_SECRET);
    expect(deletes(kit.crm.calls)).toEqual([`webhooks/${IDS.created}`]);
    expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).not.toContain(FAKE_SECRET);
  });
});
