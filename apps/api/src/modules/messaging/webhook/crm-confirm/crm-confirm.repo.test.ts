import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { CrmConfirmRepo } from './crm-confirm.repo';
import { uncertainRow } from './crm-confirm.fakes';

// docs/19 «Confirming an uncertain send»: the reads and the one compare-and-set.

const W = {
  row: uncertainRow({ dedup_key: 'report_ready:r-1' }),
  waMessageId: 'wamid.crm-1',
  patch: { status: 'delivered' as const, sent_at: '2026-11-15T20:27:18.000Z' },
};
const recorded = (calls: { method: string; args: unknown[] }[]) =>
  calls.map((c) => [c.method, ...c.args]);

describe('CrmConfirmRepo', () => {
  it('uncertain: failed outbound rows with no wamid and an uncertain code, in the span', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    const span = {
      since: new Date('2026-11-15T14:30:00Z'),
      until: new Date('2026-11-15T20:30:00Z'),
    };
    await new CrmConfirmRepo(db).uncertain({ ...span, limit: 100 });
    expect(recorded(calls)).toEqual(
      expect.arrayContaining([
        ['eq', 'direction', 'outbound'],
        ['eq', 'status', 'failed'],
        ['is', 'wa_message_id', null],
        ['in', 'error_code', ['uncertain', 'crm_uncertain']],
        ['gte', 'created_at', '2026-11-15T14:30:00.000Z'],
        ['lte', 'created_at', '2026-11-15T20:30:00.000Z'],
        ['limit', 100],
      ]),
    );
  });

  it('held and templateNames: no read for nothing; names = the CRM name and meta_name', async () => {
    const empty = fakeDb({});
    const repo = new CrmConfirmRepo(empty.db);
    await expect(repo.held([])).resolves.toEqual(new Set());
    await expect(repo.templateNames([])).resolves.toEqual(new Map());
    expect(empty.trips).toEqual([]);
    const row = { key: 'teacher_new_student', meta_name: 'teacher_new', language: 'ar' };
    const { db } = fakeDb({
      message_templates: [{ data: [{ ...row, crm_name: null, crm_language: null }] }],
    });
    await expect(new CrmConfirmRepo(db).templateNames(['teacher_new_student'])).resolves.toEqual(
      new Map([['teacher_new_student', ['teacher_lesson_v2', 'teacher_new']]]),
    );
  });

  it('attach: wamid, status and times set, error cleared, only while still uncertain', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }], lesson_reports: [{}] });
    await expect(new CrmConfirmRepo(db).attach(W)).resolves.toBe(true);
    const sets = recorded(calls);
    expect(sets).toContainEqual([
      'update',
      { ...W.patch, wa_message_id: 'wamid.crm-1', error_code: null, error_text: null },
    ]);
    expect(sets).toContainEqual(['eq', 'status', 'failed']);
    expect(sets).toContainEqual(['is', 'wa_message_id', null]);
    expect(sets).toContainEqual(['in', 'error_code', ['uncertain', 'crm_uncertain']]);
    expect(sets).toContainEqual(['update', { sent_at: '2026-11-15T20:27:18.000Z' }]);
  });

  it('attach: the row moved or the wamid is stored elsewhere: false; another error throws', async () => {
    const lost = fakeDb({ messages: [{ data: [] }] });
    await expect(new CrmConfirmRepo(lost.db).attach(W)).resolves.toBe(false);
    const dup = fakeDb({ messages: [{ error: { code: '23505', message: 'duplicate key' } }] });
    await expect(new CrmConfirmRepo(dup.db).attach(W)).resolves.toBe(false);
    const boom = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new CrmConfirmRepo(boom.db).attach(W)).rejects.toThrow('boom');
  });
});
