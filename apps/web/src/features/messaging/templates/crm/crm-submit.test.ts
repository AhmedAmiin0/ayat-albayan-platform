import type { TemplateStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { crmCanSubmit, crmOnly } from './crm-submit';

// docs/39: the crm row's «إرسال إلى ميتا» shows exactly when the API would submit it via the CRM.

const row = (status: TemplateStatus, over: { header_format?: 'document' | null; meta_id?: string | null } = {}) =>
  ({ status, header_format: null, meta_id: null, ...over });

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
});
