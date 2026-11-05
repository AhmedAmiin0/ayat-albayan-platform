import { describe, expect, it, vi } from 'vitest';
import { HttpWhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.client';
import { RECORDED, REPORT_READY, scriptedFetch, STUB_ENV, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { sendGraphTemplate } from './waba-send';

// docs/19 «CRM → Meta»: the meta driver sends what the crm driver sends (recorded stub answers).

const TO = '+966500000006';
const DOC = { bucket: 'reports', path: 'r/1.pdf', filename: 'AB-0001_report.pdf' };

describe('HttpWhatsappClient.sendTemplate on the WABA names', () => {
  it('report_ready as report_session: the PDF as a document message, then report_trial_session', async () => {
    const f = scriptedFetch(RECORDED.sendOk, RECORDED.sendOk);
    const c = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch });
    const template = templateRow({ ...REPORT_READY, crm_name: 'report_session' });
    const params = { '1': 'سارة', '2': 'الأحد', document: DOC, crm: { report: 'trial' as const } };
    await c.sendTemplate({ to: TO, template, params, documentUrl: 'https://s.local/r.pdf' });
    expect(f.requests.map((r) => r.body)).toEqual([
      expect.objectContaining({ type: 'document', document: { link: 'https://s.local/r.pdf', filename: DOC.filename } }),
      expect.objectContaining({
        type: 'template',
        template: { name: 'report_trial_session', language: { code: 'ar' }, components: [] },
      }),
    ]);
  });

  it('report_ready on its own name: one template with the PDF header', async () => {
    const f = scriptedFetch(RECORDED.sendOk);
    const c = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch });
    const params = { '1': 'سارة', '2': 'الأحد', document: DOC };
    await c.sendTemplate({ to: TO, template: REPORT_READY, params, documentUrl: 'https://s.local/r.pdf' });
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]?.body).toMatchObject({ template: { name: 'report_ready', components: [{ type: 'header' }, { type: 'body' }] } });
  });

  it('Meta\'s 132001 keeps the WABA name the row went as', async () => {
    const f = scriptedFetch(RECORDED.templateMissing);
    const c = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch });
    const template = templateRow({ crm_name: 'booking_v3' });
    const e = await c.sendTemplate({ to: TO, template, params: { '1': 'س', '2': 'ح', button: 'r' } }).catch((x: unknown) => x);
    expect((e as WaError).info).toMatchObject({ code: 132001, template: 'booking_v3' });
  });
});

describe('sendGraphTemplate', () => {
  it('a row refused while its body is built (bad values) is not tagged with a name', async () => {
    const post = vi.fn(async (_to: string, build: () => unknown) => (build(), { waMessageId: 'x' }));
    const send = sendGraphTemplate({ to: TO, template: templateRow(), params: { '1': 'س' } }, { post, document: vi.fn() });
    const e = await send.catch((x: unknown) => x);
    expect(e).toBeInstanceOf(WaError);
    expect((e as WaError).info.template).toBeUndefined();
  });
});
