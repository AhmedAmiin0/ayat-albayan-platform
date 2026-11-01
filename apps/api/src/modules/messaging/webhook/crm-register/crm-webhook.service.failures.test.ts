import { describe, expect, it } from 'vitest';
import { CRM_LINE, endpoint, failure, IDS, refusal, registrarKit } from './crm-webhook.fakes';

// docs/19 «crm driver» › delivery ticks in one click: refused before anything is made. Every
// refusal is a code, never a CRM body, the key or the secret. No network.

describe('CrmWebhookRegistrar.register: refused up front', () => {
  it('409 crm_line_required when the notifications line is not on the CRM; nothing is called', async () => {
    const kit = registrarKit({ line: null });
    const r = await refusal(() => kit.registrar.register());
    expect(r).toMatchObject({ status: 409 });
    expect(r.body).toContain('crm_line_required');
    expect(kit.crm.calls).toEqual([]);
  });

  it('409 crm_base_insecure when the CRM base is not https; nothing is called', async () => {
    const kit = registrarKit({ line: { ...CRM_LINE, base: 'http://crm.test.example/api/v1' } });
    const r = await refusal(() => kit.registrar.register());
    expect(r).toMatchObject({ status: 409 });
    expect(r.body).toContain('crm_base_insecure');
    expect(kit.crm.calls).toEqual([]);
  });

  it('409 public_url_required when API_PUBLIC_URL is not an https origin', async () => {
    const kit = registrarKit();
    const bad = [undefined, 'http://api.test.example', 'not a url', 'https://10.0.0.1'];
    for (const url of [...bad, 'https://api.test.example/v1', 'https://api.test.example/a/b/']) {
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
    expect(r.body).not.toContain(CRM_LINE.apiKey);
    expect(kit.setSecret).not.toHaveBeenCalled();
  });

  it('a CRM 401 is crm_key_refused; a 500 is crm_failed', async () => {
    const k401 = registrarKit({ answers: { 'POST webhooks': failure(401, 'unauthorized') } });
    expect((await refusal(() => k401.registrar.register())).body).toContain('crm_key_refused');
    const k500 = registrarKit({ answers: { 'POST webhooks': failure(500, 'internal') } });
    expect((await refusal(() => k500.registrar.register())).body).toContain('crm_failed');
  });

  it('a listed id that is not a uuid (a path or a log line) is crm_bad_answer; nothing is made', async () => {
    for (const id of ['..', 'a\nb', '../../me']) {
      const data = [endpoint(IDS.old1), endpoint(id)];
      const kit = registrarKit({ answers: { 'GET webhooks': { status: 200, body: { data } } } });
      const r = await refusal(() => kit.registrar.register());
      expect(r.body).toContain('crm_bad_answer');
      expect(kit.crm.calls.map((c) => c.method)).toEqual(['GET']);
    }
  });
});
