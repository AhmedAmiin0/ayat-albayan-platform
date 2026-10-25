import { describe, expect, it } from 'vitest';
import { CrmWhatsappClient } from './crm.client';
import { CRM_ENV, CRM_SENT, crmFailure } from './crm.fakes';
import { crmReportBodies } from './crm-report';
import { REPORT_READY, scriptedFetch, templateRow } from './whatsapp.fakes';
import { WaError } from './whatsapp.types';

// docs/19 «crm driver»: the lesson report like the old script — the PDF as a document, then
// report_trial_session (trial) or report_session (regular) — once report_ready's crm_name says so.

const TO = '+966500000003';
const DOC = { bucket: 'reports', path: 'r/1.pdf', filename: 'AB-0001_2026-10-25_report.pdf' };
const OLD_FLOW = templateRow({ ...REPORT_READY, crm_name: 'report_session' });
const send = (kind: 'trial' | 'regular' | undefined, template = OLD_FLOW) => ({
  to: TO,
  template,
  params: { '1': 'سارة', '2': 'الأحد', document: DOC, ...(kind ? { crm: { report: kind } } : {}) },
  documentUrl: 'https://s.local/signed.pdf',
});

describe('crmReportBodies', () => {
  it('trial → report_trial_session, regular (or unknown) → report_session; no variables', () => {
    expect(crmReportBodies(send('trial'))?.template).toEqual({
      to: TO, type: 'template', template: { name: 'report_trial_session', language: 'ar', params: {} },
    });
    expect(crmReportBodies(send('regular'))?.template).toMatchObject({ template: { name: 'report_session' } });
    expect(crmReportBodies(send(undefined))?.template).toMatchObject({ template: { name: 'report_session' } });
    expect(crmReportBodies(send('trial'))?.document).toEqual({ to: TO, type: 'document', media_url: 'https://s.local/signed.pdf', filename: DOC.filename });
  });

  it('the old flow without its PDF link: refused before any call (never a template alone)', () => {
    expect(() => crmReportBodies({ ...send('regular'), documentUrl: null })).toThrow(WaError);
  });

  it('report_ready without that crm_name keeps today\'s path (null)', () => {
    expect(crmReportBodies(send('trial', REPORT_READY))).toBeNull();
    expect(crmReportBodies({ ...send('trial'), template: templateRow({ crm_name: 'report_session' }) })).toBeNull();
  });
});

describe('CrmWhatsappClient: the report flow', () => {
  const client = (f: ReturnType<typeof scriptedFetch>) => new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch, timeoutMs: 1_000 });

  it('two calls, document first; the template\'s wamid is kept', async () => {
    const second = { ...CRM_SENT, body: { data: { ...CRM_SENT.body.data, whatsapp_message_id: 'wamid.crm-2' } } };
    const f = scriptedFetch(CRM_SENT, second);
    await expect(client(f).sendTemplate(send('trial'))).resolves.toEqual({ waMessageId: 'wamid.crm-2' });
    expect(f.requests.map((r) => (r.body as { type: string }).type)).toEqual(['document', 'template']);
  });

  it('the template fails after the PDF went: uncertain (never resent automatically, no second PDF)', async () => {
    const f = scriptedFetch(CRM_SENT, crmFailure(429, 'rate_limited'));
    const e = await client(f).sendTemplate(send('regular')).then(() => null, (x: unknown) => x);
    expect(e).toBeInstanceOf(WaError);
    expect((e as WaError).info).toMatchObject({ uncertain: true, crmCode: 'rate_limited' });
    expect((e as WaError).message).toMatch(/refused its template/);
  });

  it('the template call may have gone (a 5xx, a timeout): says so, never «not sent»', async () => {
    const f = scriptedFetch(CRM_SENT, crmFailure(500, 'internal'));
    const e = await client(f).sendTemplate(send('regular')).then(() => null, (x: unknown) => x);
    expect((e as WaError).info).toMatchObject({ uncertain: true });
    expect((e as WaError).message).toMatch(/may have gone too/);
  });

  it('the key refused between the two calls keeps its credential flag', async () => {
    const f = scriptedFetch(CRM_SENT, crmFailure(401, 'unauthorized'));
    const e = await client(f).sendTemplate(send('regular')).then(() => null, (x: unknown) => x);
    expect((e as WaError).info).toMatchObject({ uncertain: true, credential: 'crm' });
  });

  it('the PDF itself fails: that error, nothing else is called', async () => {
    const f = scriptedFetch(crmFailure(502, 'meta_error'));
    const e = await client(f).sendTemplate(send('regular')).then(() => null, (x: unknown) => x);
    expect((e as WaError).info).toMatchObject({ crmCode: 'meta_error' });
    expect(f.requests).toHaveLength(1);
  });
});
