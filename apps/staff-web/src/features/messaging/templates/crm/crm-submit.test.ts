import type { TemplateStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { crmCanSubmit, crmOnly } from './crm-submit';

// docs/39: the crm row's «إرسال إلى ميتا» shows exactly when the API would submit it via the CRM.

interface Over {
  header_format?: 'document' | null;
  meta_id?: string | null;
  key?: string;
  crm_name?: string | null;
  crm_language?: string | null;
}
const BASE = { key: 'renewal_due', meta_name: 'renewal_due', language: 'ar', header_format: null, meta_id: null };
const row = (status: TemplateStatus, over: Over = {}) => ({ ...BASE, status, ...over });

describe('crmCanSubmit', () => {
  it.each(['not_submitted', 'missing', 'rejected'] as const)('%s without a meta_id: yes', (status) => {
    expect(crmCanSubmit(row(status))).toBe(true);
    expect(crmOnly(row(status))).toBeNull();
  });

  it('not_submitted / missing with a meta_id: yes (only a rejected one is edited in the CRM)', () => {
    expect(crmCanSubmit(row('missing', { meta_id: 'mt-1' }))).toBe(true);
    expect(crmCanSubmit(row('not_submitted', { meta_id: 'mt-1' }))).toBe(true);
  });

  it('rejected with a meta_id: no, edited in the CRM dashboard', () => {
    expect(crmCanSubmit(row('rejected', { meta_id: 'mt-1' }))).toBe(false);
    expect(crmOnly(row('rejected', { meta_id: 'mt-1' }))).toBe('rejected');
  });

  it.each(['not_submitted', 'missing', 'rejected'] as const)('a document header (%s): never, made in the CRM', (status) => {
    expect(crmCanSubmit(row(status, { header_format: 'document' }))).toBe(false);
    expect(crmOnly(row(status, { header_format: 'document', meta_id: 'mt-1' }))).toBe('document');
  });

  it.each(['approved', 'pending', 'paused', 'disabled'] as const)('%s: no button and no reason', (status) => {
    expect(crmCanSubmit(row(status))).toBe(false);
    expect(crmOnly(row(status, { header_format: 'document' }))).toBeNull();
  });

  it.each([
    ['the old script\'s default (teacher_lesson_v2)', { key: 'teacher_new_student', meta_name: 'teacher_new_student' }],
    ['an admin\'s crm_name', { crm_name: 'renewal_v2' }],
    ['another crm_language', { crm_language: 'ar_EG' }],
  ] as const)('known in the CRM by another name, %s: never, managed in the CRM', (_, over) => {
    const named = { ...row('rejected'), ...over };
    expect(crmCanSubmit(named)).toBe(false);
    expect(crmOnly(named)).toBe('named');
    expect(crmCanSubmit({ ...named, status: 'not_submitted' })).toBe(false);
  });

  it('a crm_name equal to meta_name is the row\'s own name: shown', () => {
    expect(crmCanSubmit(row('not_submitted', { crm_name: 'renewal_due' }))).toBe(true);
  });
});
