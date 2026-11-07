import { describe, expect, it } from 'vitest';
import { crmComponents, crmTextSchema } from './crm-components';
import { crmTemplates } from './crm-templates';
import { CRM_ENV } from './crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// The CRM's own template text kept as Meta components (owner 2026-11-07). No network.

const parse = (raw: unknown) => crmComponents(crmTextSchema.parse(raw));
const REMINDER = {
  name: 'teacher_lesson_reminder', language: 'ar', status: 'APPROVED', category: 'UTILITY',
  meta_template_id: 'mt-9', quality_score: null, rejection_reason: null,
  header_type: null, header_content: null, body_text: 'أستاذ {{1}}، عندك حلقة {{2}}',
  footer_text: 'أكاديمية آيات البيان', buttons: [],
};

describe('crmComponents', () => {
  it('the teacher reminder: body and footer, no header, no buttons', () => {
    expect(parse(REMINDER)).toEqual([
      { type: 'BODY', text: 'أستاذ {{1}}، عندك حلقة {{2}}' },
      { type: 'FOOTER', text: 'أكاديمية آيات البيان' },
    ]);
  });

  it('a text header and URL / quick-reply buttons, upper-cased like Meta', () => {
    const raw = {
      header_type: 'text', header_content: 'تذكير', body_text: 'b',
      buttons: [{ type: 'URL', text: 'ادخل', url: 'https://x.test/j/{{1}}', example: 'e' }, { type: 'quick_reply', text: 'تم' }],
    };
    expect(parse(raw)).toEqual([
      { type: 'HEADER', format: 'TEXT', text: 'تذكير' },
      { type: 'BODY', text: 'b' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'ادخل', url: 'https://x.test/j/{{1}}' }, { type: 'QUICK_REPLY', text: 'تم' }] },
    ]);
    expect(parse({ header_type: 'document', body_text: 'b' })[0]).toEqual({ type: 'HEADER', format: 'DOCUMENT' });
  });

  it('tolerates their absence or a malformed field: no body = no components', () => {
    expect(parse({})).toEqual([]);
    expect(parse({ body_text: 'b', buttons: 'oops', footer_text: 3 })).toEqual([{ type: 'BODY', text: 'b' }]);
  });

  it('crmTemplates carries them on the listed MetaTemplate', async () => {
    const body = { data: [REMINDER], meta: { next_cursor: null } };
    const f = scriptedFetch({ status: 200, body });
    const [t] = await crmTemplates({ env: CRM_ENV, fetch: f.fetch, timeoutMs: 1_000 });
    expect(t?.components).toHaveLength(2);
  });
});
