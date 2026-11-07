import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { REPORT_READY } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { renderSent } from './crm-sent-render';
import { sentTemplate } from './crm-sent-template';

// The old report flow sends report_session / report_trial_session: those are the copies shown.

const REPORT = { ...REPORT_READY, crm_name: 'report_session' };
const params = (report: 'trial' | 'regular') => ({
  1: 'سارة', 2: 'الأحد', document: { bucket: 'reports', path: 'r/x.pdf', filename: 'x.pdf' }, crm: { report },
});

describe('sentTemplate + renderSent', () => {
  it('the report flow resolves the trial or regular CRM template by params.crm.report', () => {
    const name = (r: 'trial' | 'regular') =>
      sentTemplate({ row: messageRow({ template_params: params(r) }), template: REPORT })?.name;
    expect([name('trial'), name('regular')]).toEqual(['report_trial_session', 'report_session']);
  });

  it('a document header and the PDF link in the wa.me text; a button without a sent value has no link', () => {
    const copy = [
      { type: 'HEADER', format: 'DOCUMENT' },
      { type: 'BODY', text: 'تقرير الحلقة' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'افتح', url: 'https://x.example/{{1}}' }] },
    ];
    const sent = { name: 'report_session', language: 'ar', body: [], header: null, buttons: [] };
    const out = renderSent({ copy, sent, key: 'report_ready', documentUrl: 'https://s.example/r.pdf' });
    expect(out.block).toEqual({ header: { type: 'document' }, footer: null, buttons: [{ type: 'url', text: 'افتح' }] });
    expect(out.text).toBe('تقرير الحلقة\n\nhttps://s.example/r.pdf');
  });
});

describe('migration 20261107001000: crm_template_copies', () => {
  const sql = readFileSync(join(MIGRATIONS_DIR, '20261107001000_crm_template_copy.sql'), 'utf8');

  it('keyed by the CRM name + language; RLS on, admin read only, no client writes', () => {
    expect(sql).toContain('primary key (name, language)');
    expect(sql).toContain('alter table public.crm_template_copies enable row level security');
    expect(sql).toContain('from authenticated');
    expect(sql).toContain('using ((select public.is_admin()))');
  });
});
