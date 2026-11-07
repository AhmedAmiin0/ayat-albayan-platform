import { CRM_REPORT_TEMPLATES, type CrmReportKind } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { REPORT_READY, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { wabaReport } from './waba-report';

// Guard (2026-11-07): the old report templates' body gets exactly their slot count (docs/19).

/** The CRM's report templates take no variables (the old script sent them without any). */
const CRM_SLOTS: Readonly<Record<string, number>> = { report_session: 0, report_trial_session: 0 };

const send = (report: CrmReportKind) => ({
  to: '+966500000005',
  template: templateRow({ ...REPORT_READY, crm_name: 'report_session' }),
  params: { document: { bucket: 'reports', path: 'r/1.pdf', filename: 'r.pdf' }, crm: { report } },
  documentUrl: 'https://s.local/signed.pdf',
});

describe('report template body length = the CRM template\'s slot count', () => {
  const kinds: CrmReportKind[] = ['trial', 'regular'];
  it.each(kinds)('%s', (kind) => {
    const name = CRM_REPORT_TEMPLATES[kind];
    const sent = wabaReport(send(kind))?.template;
    expect(sent?.name).toBe(name);
    expect(sent?.body).toHaveLength(CRM_SLOTS[name] ?? -1);
  });
});
