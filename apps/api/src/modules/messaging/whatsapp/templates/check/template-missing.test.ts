import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { crmErrorFrom } from '@/modules/messaging/whatsapp/drivers/crm/crm-http';
import { crmFailure } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import type { TemplatesQueries } from '@/modules/messaging/whatsapp/templates/catalog/templates.queries';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { absentOnCrm, TemplateMissing } from './template-missing';

// «تحقق من القالب» (owner 2026-10-31): Meta #132001 through the CRM marks the template missing.

const META_132001 = 'Meta API error: (#132001) Template name does not exist in the translation';
const crm = (status: number, code: string, message?: string) => {
  const text = JSON.stringify(crmFailure(status, code, message).body);
  return crmErrorFrom({ status, text, retryAfter: null });
};
/** A #132001 for the template the CRM was asked for (crm.client.ts sentAs). */
const absentAs = (template: string) => {
  const e = crm(502, 'meta_error', META_132001);
  return new WaError(e.message, { ...e.info, template });
};
const absent = absentAs('teacher_lesson_v2');

const queries = { get: vi.fn(), update: vi.fn() };
const audit = { record: vi.fn() };
const NOW = new Date('2026-10-31T08:00:00Z');
const marker = () =>
  new TemplateMissing(queries as unknown as TemplatesQueries, audit as unknown as AuditService);
const send = (over: object = {}) => ({ key: 'teacher_new_student', line: 'notifications' as const, error: absent, now: NOW, ...over });

beforeEach(() => {
  vi.resetAllMocks();
  queries.get.mockResolvedValue(templateRow({ key: 'teacher_new_student', status: 'approved' }));
  queries.update.mockImplementation(async (key: string, patch: object) => {
    return { ...templateRow({ key }), ...patch };
  });
});

describe('absentOnCrm', () => {
  it('a CRM meta_error carrying #132001 (by code or by Meta’s words)', () => {
    expect(absentOnCrm(absent)).toBe(true);
    expect(absentOnCrm(crm(502, 'meta_error', 'Template name does not exist in the translation'))).toBe(true);
  });

  it('nothing else: another Meta error, another CRM code, Meta’s own 132001 on a meta line, a plain error', () => {
    expect(absentOnCrm(crm(502, 'meta_error', 'Meta API error: (#131026) Message undeliverable'))).toBe(false);
    expect(absentOnCrm(crm(500, 'template_malformed', '132001'))).toBe(false);
    expect(absentOnCrm(new WaError('Template name does not exist', { code: 132001, status: 404 }))).toBe(false);
    expect(absentOnCrm(new Error(META_132001))).toBe(false);
  });
});

describe('TemplateMissing.check', () => {
  it('an approved row of that line → missing (compare-and-set), the CRM’s words kept, audited as the system', async () => {
    await marker().check(send());
    expect(queries.update).toHaveBeenCalledWith(
      'teacher_new_student',
      { status: 'missing', last_error: META_132001, last_checked_at: NOW.toISOString() },
      'approved',
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: null,
      action: 'template_marked_missing',
      before: expect.objectContaining({ status: 'approved', line: 'notifications' }),
      after: expect.objectContaining({ status: 'missing', error: META_132001 }),
    }));
  });

  it('reads nothing for a session message or any other failure', async () => {
    await marker().check(send({ key: null }));
    await marker().check(send({ error: crm(429, 'rate_limited') }));
    expect(queries.get).not.toHaveBeenCalled();
  });

  it('leaves a row already not approved, or on the other line (moved meanwhile)', async () => {
    queries.get.mockResolvedValueOnce(templateRow({ status: 'missing' }));
    await marker().check(send());
    queries.get.mockResolvedValueOnce(templateRow({ status: 'approved', line: 'chat' }));
    await marker().check(send());
    queries.get.mockResolvedValueOnce(null);
    await marker().check(send());
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('only the key’s own CRM name: a fallback (meta_name) or an unnamed failure leaves the row', async () => {
    const meet = 'teacher_lesson_reminder_meet';
    queries.get.mockResolvedValue(templateRow({ key: meet, meta_name: meet, status: 'approved' }));
    await marker().check(send({ key: meet, error: absentAs(meet) }));
    await marker().check(send({ key: meet, error: crm(502, 'meta_error', META_132001) }));
    queries.get.mockResolvedValue(templateRow({ key: 'teacher_new_student', meta_name: 'teacher_new_student' }));
    await marker().check(send({ error: absentAs('teacher_new_student') }));
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('the Meet reminder by its CRM name (teacher_lesson_reminder) → missing', async () => {
    const meet = 'teacher_lesson_reminder_meet';
    queries.get.mockResolvedValue(templateRow({ key: meet, meta_name: meet, status: 'approved' }));
    await marker().check(send({ key: meet, error: absentAs('teacher_lesson_reminder') }));
    expect(queries.update).toHaveBeenCalledWith(meet, expect.objectContaining({ status: 'missing' }), 'approved');
  });

  it('an admin’s crm_name is the key’s own name, the default then a fallback', async () => {
    const row = templateRow({ key: 'teacher_new_student', meta_name: 'teacher_new_student', crm_name: 'tn_v3' });
    queries.get.mockResolvedValue(row);
    await marker().check(send({ error: absent }));
    expect(queries.update).not.toHaveBeenCalled();
    await marker().check(send({ error: absentAs('tn_v3') }));
    expect(queries.update).toHaveBeenCalledTimes(1);
  });

  it('a second failure that lost the compare-and-set writes no second audit row', async () => {
    queries.update.mockResolvedValueOnce(null);
    await marker().check(send());
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('never throws: a failed read or write only logs (the send’s failure is recorded already)', async () => {
    queries.get.mockRejectedValueOnce(new Error('db down'));
    await expect(marker().check(send())).resolves.toBeUndefined();
  });
});
