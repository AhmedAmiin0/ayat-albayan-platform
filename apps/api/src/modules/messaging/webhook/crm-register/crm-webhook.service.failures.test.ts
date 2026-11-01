import { HttpException, Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRM_LINE, endpoint, FAKE_SECRET, registrarKit } from './crm-webhook.fakes';

// docs/19 «crm driver» › delivery ticks in one click: every refusal is a code, never a CRM body or
// the secret. No network.

afterEach(() => vi.restoreAllMocks());

const failure = (status: number, code: string) => ({
  status,
  body: { error: { code, message: code } },
});

async function refusal(run: () => Promise<unknown>): Promise<{ status: number; body: string }> {
  const e = await run().then(() => null, (x: unknown) => x);
  expect(e).toBeInstanceOf(HttpException);
  const http = e instanceof HttpException ? e : new HttpException('none', 0);
  return { status: http.getStatus(), body: JSON.stringify(http.getResponse()) + http.message };
}

describe('CrmWebhookRegistrar.register: refused', () => {
  it('409 crm_line_required when the notifications line is not on the CRM; nothing is called', async () => {
    const kit = registrarKit({ line: null });
    const r = await refusal(() => kit.registrar.register());
    expect(r).toMatchObject({ status: 409 });
    expect(r.body).toContain('crm_line_required');
    expect(kit.crm.calls).toEqual([]);
  });

  it('409 public_url_required when API_PUBLIC_URL is not https', async () => {
    const kit = registrarKit();
    for (const url of [undefined, 'http://api.test.example', 'not a url', 'https://10.0.0.1']) {
      kit.source.publicUrl = () => url;
      const r = await refusal(() => kit.registrar.register());
      expect(r.body).toContain('public_url_required');
    }
    expect(kit.crm.calls).toEqual([]);
  });

  it('a CRM 403 is crm_scope_missing (the key lacks webhooks:manage)', async () => {
    const kit = registrarKit({ answers: { 'GET webhooks': failure(403, 'forbidden') } });
    const r = await refusal(() => kit.registrar.register());
    expect(r).toMatchObject({ status: 502 });
    expect(r.body).toContain('crm_scope_missing');
    expect(kit.setSecret).not.toHaveBeenCalled();
  });

  it('a CRM 401 is crm_key_refused; a 500 is crm_failed', async () => {
    const k401 = registrarKit({ answers: { 'POST webhooks': failure(401, 'unauthorized') } });
    expect((await refusal(() => k401.registrar.register())).body).toContain('crm_key_refused');
    const k500 = registrarKit({ answers: { 'POST webhooks': failure(500, 'internal') } });
    expect((await refusal(() => k500.registrar.register())).body).toContain('crm_failed');
  });

  it('a 201 without its secret is crm_bad_answer: the endpoint it made is removed, nothing stored', async () => {
    const answers = { 'POST webhooks': { status: 201, body: { data: endpoint('half-1') } } };
    const kit = registrarKit({ answers });
    const r = await refusal(() => kit.registrar.register());
    expect(r.body).toContain('crm_bad_answer');
    expect(kit.crm.calls.at(-1)).toMatchObject({ method: 'DELETE', path: 'webhooks/half-1' });
    expect(kit.setSecret).not.toHaveBeenCalled();
  });

  it('a malformed secret never reaches the error (no ZodError dump)', async () => {
    const bad = `not-whsec-${FAKE_SECRET}`;
    const answers = { 'POST webhooks': { status: 201, body: { data: { ...endpoint('n'), secret: bad } } } };
    const r = await refusal(() => registrarKit({ answers }).registrar.register());
    expect(r.body).toContain('crm_bad_answer');
    expect(r.body).not.toContain(bad);
  });

  it('storing fails: the new endpoint is removed, 500 secret_store_failed, no secret in logs', async () => {
    const spies = (['log', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(Logger.prototype, m).mockImplementation(() => undefined),
    );
    const kit = registrarKit();
    kit.setSecret.mockRejectedValue(new Error(`vault refused ${FAKE_SECRET}`));
    const r = await refusal(() => kit.registrar.register());
    expect(r).toMatchObject({ status: 500 });
    expect(r.body).toContain('secret_store_failed');
    expect(r.body).not.toContain(FAKE_SECRET);
    expect(kit.crm.calls.at(-1)).toMatchObject({ method: 'DELETE', path: 'webhooks/new-1' });
    expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).not.toContain(FAKE_SECRET);
  });

  it('a refusal never carries the CRM key either', async () => {
    const kit = registrarKit({ answers: { 'GET webhooks': failure(403, 'forbidden') } });
    expect((await refusal(() => kit.registrar.register())).body).not.toContain(CRM_LINE.apiKey);
  });
});
