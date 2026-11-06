import { describe, expect, it } from 'vitest';
import { crmSubmit, crmTemplatePayload, crmTemplates } from './crm-templates';
import { CRM_ENV } from './crm.fakes';
import { scriptedFetch, templateRow, REMINDER_24H } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// docs/39: a crm line's template list and submit through the CRM's /templates. No network.

const conn = (f: ReturnType<typeof scriptedFetch>) =>
  ({ env: CRM_ENV, fetch: f.fetch, timeoutMs: 1_000 });
const crmRow = (over: Record<string, unknown> = {}) => ({
  name: 'booking_confirmation', language: 'ar', status: 'APPROVED', category: 'UTILITY',
  meta_template_id: 'mt-1', quality_score: 'GREEN', rejection_reason: null, ...over,
});
const listed = (...data: unknown[]) =>
  scriptedFetch({ status: 200, body: { data, meta: { next_cursor: null } } });
const caught = (p: Promise<unknown>) => p.catch((x: unknown) => x);

describe('crmTemplates', () => {
  it('GETs templates?sync=1&limit=100 and maps each row to a MetaTemplate', async () => {
    const f = listed(crmRow(), crmRow({ name: 'x', status: 'REJECTED', meta_template_id: null, category: null, quality_score: null, rejection_reason: 'bad' }));
    await expect(crmTemplates(conn(f))).resolves.toEqual([
      { id: 'mt-1', name: 'booking_confirmation', language: 'ar', status: 'APPROVED', category: 'UTILITY', quality: 'GREEN', components: [], rejectedReason: null },
      { id: '', name: 'x', language: 'ar', status: 'REJECTED', category: '', quality: null, components: [], rejectedReason: 'bad' },
    ]);
    expect(f.requests[0]?.url).toBe(`${CRM_ENV.base}/templates?sync=1&limit=100`);
    expect(f.requests[0]?.init.method).toBe('GET');
  });

  it('a DRAFT was never on Meta: it reads as absent', async () => {
    const list = await crmTemplates(conn(listed(crmRow({ name: 'd', status: 'draft' }), crmRow())));
    expect(list.map((t) => t.name)).toEqual(['booking_confirmation']);
  });

  it('an unreadable list is a WaError, never an empty list', async () => {
    expect(await caught(crmTemplates(conn(listed({ name: 1 }))))).toBeInstanceOf(WaError);
    const none = conn(scriptedFetch({ status: 200, body: {} }));
    expect(await caught(crmTemplates(none))).toBeInstanceOf(WaError);
  });
});

describe('crmTemplatePayload', () => {
  it('the name and language the sends go by, a capitalised category, a URL example and sample values', () => {
    const row = templateRow({ key: 'teacher_new_student', meta_name: 'teacher_new_student', samples: ['سارة', 'الأحد'] });
    expect(crmTemplatePayload(row)).toEqual({
      name: 'teacher_lesson_v2',
      language: 'ar',
      category: 'Utility',
      body_text: row.body_ar,
      footer_text: 'أكاديمية آيات البيان',
      buttons: [{ type: 'URL', text: '', url: 'https://meet.jit.si/{{1}}', example: 'https://meet.jit.si/sample' }],
      sample_values: { body: ['سارة', 'الأحد'] },
    });
  });

  it('crm_name / crm_language win; quick replies; a text header; no footer, no values', () => {
    const row = templateRow({
      ...REMINDER_24H, crm_name: 'reminder_old', crm_language: 'en', category: 'marketing', footer_ar: null, params: [],
      display: { header: { type: 'text', text: 'تذكير' }, buttons: [] },
    });
    expect(crmTemplatePayload(row)).toEqual({
      name: 'reminder_old', language: 'en', category: 'Marketing', header_type: 'text', header_content: 'تذكير',
      body_text: REMINDER_24H.body_ar,
      buttons: [
        { type: 'QUICK_REPLY', text: 'تمام، هنحضر' }, { type: 'QUICK_REPLY', text: 'محتاجين نغيّر الميعاد' },
      ],
    });
  });

  it('a fixed URL has no example; a document header is never sent as text', () => {
    const row = templateRow({
      header_format: 'document', buttons: [{ type: 'url', url: 'https://x.test/a', text: 'افتح' }],
      display: { header: { type: 'text', text: 'h' }, buttons: [] },
    });
    const payload = crmTemplatePayload(row);
    expect(payload.buttons).toEqual([{ type: 'URL', text: 'افتح', url: 'https://x.test/a' }]);
    expect(payload).not.toHaveProperty('header_type');
  });
});

describe('crmSubmit', () => {
  it('POSTs templates with the payload; the answer is the meta id and status', async () => {
    const f = scriptedFetch({ status: 201, body: { data: { meta_template_id: 'mt-9', status: 'PENDING', template: null, dry_run: false } } });
    await expect(crmSubmit(conn(f), templateRow())).resolves.toEqual({ metaId: 'mt-9', status: 'PENDING' });
    expect(f.requests[0]?.url).toBe(`${CRM_ENV.base}/templates`);
    expect(f.requests[0]?.init.method).toBe('POST');
    expect(f.requests[0]?.body).toMatchObject({ name: 'booking_confirmation', category: 'Utility' });
  });

  it('a 2xx without a meta_template_id is a WaError', async () => {
    const empty = conn(scriptedFetch({ status: 201, body: { data: {} } }));
    expect(await caught(crmSubmit(empty, templateRow()))).toBeInstanceOf(WaError);
  });
});
