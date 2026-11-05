import { describe, expect, it } from 'vitest';
import { CrmWhatsappClient } from './crm.client';
import { CRM_ENV, CRM_SENT } from './crm.fakes';
import {
  REPORT_READY,
  scriptedFetch,
  templateRow,
} from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// docs/19 «Report flow» (owner 2026-11-05): report_ready as the WABA's approved session_report_pdf
// (migration 20261105000301): ONE template call, the PDF as its document header, four body values.

const TO = '+966500000003';
const DOC = { bucket: 'reports', path: 'r/1.pdf', filename: 'AB-0001_2026-10-25_report.pdf' };
const ROW = templateRow({
  ...REPORT_READY,
  crm_name: 'session_report_pdf',
  crm_language: 'ar',
  body_ar: 'تقرير {{1}} بتاريخ {{2}} مع {{3}}: {{4}}',
  status: 'approved',
});
const PARAMS = {
  '1': 'سارة',
  '2': '26/10/2026',
  '3': 'أ. هدى',
  '4': 'https://api.example/r/Ab12Cd34Ef',
  document: DOC,
  crm: { report: 'trial' as const },
};
const client = (f: ReturnType<typeof scriptedFetch>) =>
  new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch, timeoutMs: 1_000 });

describe('CrmWhatsappClient: report_ready as session_report_pdf', () => {
  it('one call: the template with the PDF header and [student, date, teacher, feedback link]; trial too', async () => {
    const f = scriptedFetch(CRM_SENT);
    await client(f).sendTemplate({
      to: TO,
      template: ROW,
      params: PARAMS,
      documentUrl: 'https://s.local/signed.pdf',
    });
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0]?.body).toEqual({
      to: TO,
      type: 'template',
      template: {
        name: 'session_report_pdf',
        language: 'ar',
        params: {
          body: ['سارة', '26/10/2026', 'أ. هدى', 'https://api.example/r/Ab12Cd34Ef'],
          headerMediaUrl: 'https://s.local/signed.pdf',
        },
      },
    });
  });

  it('a row queued before the change (two values) or without its PDF is refused before any call', async () => {
    const f = scriptedFetch(CRM_SENT);
    const old = { '1': 'سارة', '2': 'الأحد', document: DOC };
    await expect(
      client(f).sendTemplate({
        to: TO,
        template: ROW,
        params: old,
        documentUrl: 'https://s.local/signed.pdf',
      }),
    ).rejects.toBeInstanceOf(WaError);
    await expect(
      client(f).sendTemplate({ to: TO, template: ROW, params: PARAMS, documentUrl: null }),
    ).rejects.toBeInstanceOf(WaError);
    expect(f.requests).toHaveLength(0);
  });
});
