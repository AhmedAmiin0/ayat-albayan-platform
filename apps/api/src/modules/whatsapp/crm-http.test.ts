import { describe, expect, it } from 'vitest';
import { crmErrorFrom, crmJson } from './crm-http';
import { CRM_ENV, crmFailure } from './crm.fakes';
import { failurePlan, CRM_AUTH } from './send-plan';
import { scriptedFetch } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

// docs/19 «crm driver»: the CRM's answers that are about the line, not the message. No network.

const NOW = new Date('2026-10-25T09:00:00Z');
const answer = (status: number, body: unknown) => ({ status, text: JSON.stringify(body), retryAfter: null });

describe('crmErrorFrom: a line-level fault', () => {
  it('400 whatsapp_not_configured (the CRM lost its WhatsApp): held like a refused key, rows stay queued', () => {
    const e = crmErrorFrom(answer(400, crmFailure(400, 'whatsapp_not_configured').body));
    expect(e.info).toMatchObject({ credential: 'crm', crmCode: 'whatsapp_not_configured' });
    expect(failurePlan({ error: e, attempts: 1, now: NOW })).toMatchObject({ status: 'queued', error_code: CRM_AUTH, attempts: 0 });
  });

  it('a body that is not the CRM envelope (a proxy page) is http_<status> only: its text is never kept', () => {
    const e = crmErrorFrom({ status: 404, text: '<html>internal-host debug</html>', retryAfter: null });
    expect(e.info).toMatchObject({ crmCode: 'http_404', details: undefined });
    expect(e.message).not.toContain('internal-host');
  });
});

describe('crmJson: redirects', () => {
  it('asks fetch not to follow; a 3xx (a wrong base) fails as not sent, never uncertain', async () => {
    const f = scriptedFetch({ status: 302, body: {} });
    const e = await crmJson({ env: CRM_ENV, fetch: f.fetch, timeoutMs: 1_000 }, { path: 'messages', method: 'POST', body: {} }).catch((x: unknown) => x);
    expect(f.requests[0]?.init.redirect).toBe('manual');
    expect(e).toBeInstanceOf(WaError);
    const info = (e as WaError).info;
    expect(info).toMatchObject({ crmCode: 'http_302', status: 302 });
    expect(info.uncertain).toBeUndefined();
    expect(failurePlan({ error: e, attempts: 1, now: NOW })).toMatchObject({ status: 'failed', error_code: 'crm_http_302' });
  });
});
