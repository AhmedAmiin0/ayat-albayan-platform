// Invented CRM templates (Meta shapes): status/body/button sync, seeded keys kept, upsert SQL.
import { describe, expect, it } from 'vitest';
import type { TargetTx } from '../../db/target.ts';
import type { PlanItem } from '../../types.ts';
import type { CrmRow } from '../../types.ts';
import { templateButtons } from './buttons.ts';
import { mapTemplates, messageTemplatesModule, templateKeyFor } from './templates.ts';
import { upsertTemplateSql } from './write.ts';

const tpl = (o: Partial<Record<string, unknown>>): CrmRow => ({
  id: `t-${String(o['name'])}`,
  category: 'Utility',
  language: 'ar',
  header_type: null,
  body_text: 'حلقة {{1}} — {{2}}',
  footer_text: 'footer',
  buttons: null,
  status: 'APPROVED',
  meta_template_id: '123',
  ...o,
});
const url = { type: 'URL', text: 'ادخل الحلقة', url: 'https://meet.example/{{1}}', example: ['x'] };

describe('mapTemplates', () => {
  const out = mapTemplates({
    crm: {
      message_templates: [
        tpl({ name: 'lesson_reminder_v2', buttons: [url] }),
        tpl({
          name: 'brand_new',
          status: 'PENDING',
          category: 'MARKETING',
          body_text: 'x {{1}} {{3}}',
        }),
        tpl({ name: 'old_report', status: 'PENDING_DELETION' }),
        tpl({ name: 'weird', status: 'LIMBO', buttons: [{ type: 'QUICK_REPLY', text: 'ok' }] }),
        tpl({ name: 'no_body', body_text: '' }),
      ],
    },
  });

  it('keeps the seeded registry key and syncs Meta text and buttons', () => {
    const m = out[0];
    expect(m?.ok && m.key).toEqual({ entity: 'message_templates', key: 'lesson_reminder_v2' });
    expect(m?.ok && m.value.columns).toMatchObject({
      key: 'lesson_reminder',
      meta_name: 'lesson_reminder_v2',
      status: 'approved',
      category: 'utility',
      header_format: null,
      body_ar: 'حلقة {{1}} — {{2}}',
      footer_ar: 'footer',
      meta_id: '123',
      buttons: JSON.stringify([{ type: 'url', url: url.url, text: url.text }]),
    });
  });

  it('gives a new template key = Meta name and var_n params', () => {
    const m = out[1];
    expect(m?.ok && m.value.columns).toMatchObject({
      key: 'brand_new',
      status: 'pending',
      category: 'marketing',
      params: JSON.stringify(['var_1', 'var_2', 'var_3']),
      buttons: '[]',
    });
  });

  it('skips templates being deleted, sends the unrepresentable to review', () => {
    expect(
      out.slice(2).map((m) => [m.ok, m.issues.map((i) => [i.code, i.severity, i.field])]),
    ).toEqual([
      [false, [['unmapped_value', 'warn', 'status']]],
      [
        false,
        [
          ['unmapped_value', 'review', 'status'],
          ['unmapped_value', 'review', 'buttons'],
        ],
      ],
      [false, [['missing_field', 'review', 'body_text']]],
    ]);
  });
});

describe('templateKeyFor / templateButtons', () => {
  it('maps Meta names to registry keys', () => {
    expect(templateKeyFor('lesson_reminder_v2')).toBe('lesson_reminder');
    expect(templateKeyFor('booking_confirmation')).toBe('booking_confirmation');
  });
  it('accepts URL buttons only', () => {
    expect(templateButtons(undefined)).toEqual([]);
    expect(templateButtons([{ type: 'url', url: 'https://x' }])).toEqual([
      { type: 'url', url: 'https://x' },
    ]);
    expect(templateButtons({})).toBeUndefined();
    expect(templateButtons([{ type: 'URL' }])).toBeUndefined();
    expect(templateButtons(['x'])).toBeUndefined();
  });
});

describe('upsert', () => {
  const columns = { key: 'k', meta_name: 'm', status: 'approved', buttons: '[]' };

  it('upserts on (meta_name, language) and only syncs Meta-owned columns', () => {
    const q = upsertTemplateSql(columns);
    expect(q.text).toContain(
      'on conflict (meta_name, language) do update set status = excluded.status',
    );
    expect(q.text).not.toMatch(/set .*key = excluded/);
    expect(q.text).toContain('$9::jsonb');
    expect(q.params).toHaveLength(11);
    expect(q.params[0]).toBe('k');
    expect(q.params[2]).toBeNull();
  });

  it('writes through tx.exec and records no uuid', async () => {
    const execs: string[] = [];
    const tx = {
      exec: async (q: { text: string }) => void execs.push(q.text),
    } as unknown as TargetTx;
    const item = {} as PlanItem;
    const res = await messageTemplatesModule.write?.({ tx, item, columns });
    expect(res).toEqual({ targetId: null, targetPath: null });
    expect(execs).toHaveLength(1);
  });
});
