import { describe, expect, it } from 'vitest';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { MetaTemplate } from '@/modules/messaging/whatsapp/whatsapp.types';
import { crmSyncPatch } from './template-waba-match';

// docs/39: «مزامنة» on a crm line reads each row by crmTemplateName / crmTemplateLanguage.

const NOW = new Date('2026-11-07T10:00:00Z');
const crm = (name: string, over: Partial<MetaTemplate> = {}): MetaTemplate => ({
  id: `id-${name}`,
  name,
  language: 'ar',
  status: 'APPROVED',
  category: 'UTILITY',
  quality: null,
  components: [],
  rejectedReason: null,
  ...over,
});

describe('crmSyncPatch: statuses from the CRM', () => {
  it('a row whose meta_name is the CRM name (renewal_due, PENDING in the CRM) reads pending', () => {
    const row = templateRow({ key: 'renewal_due', meta_name: 'renewal_due', status: 'approved', meta_id: null });
    const patch = crmSyncPatch(row, [crm('renewal_due', { status: 'PENDING' })], NOW);
    expect(patch).toMatchObject({ status: 'pending', meta_id: 'id-renewal_due', last_error: null });
  });

  it.each([
    ['APPROVED', 'approved'],
    ['PENDING', 'pending'],
    ['REJECTED', 'rejected'],
  ] as const)('%s in the CRM → %s', (status, ours) => {
    expect(crmSyncPatch(templateRow({ status: 'missing' }), [crm('booking_confirmation', { status })], NOW).status).toBe(ours);
  });

  it('a hand-set status stays when the CRM has no such template (only the check time moves)', () => {
    const row = templateRow({ status: 'approved' });
    expect(crmSyncPatch(row, [crm('other_template')], NOW)).toEqual({ last_checked_at: NOW.toISOString() });
  });

  it('another language is another template', () => {
    const row = templateRow({ status: 'approved' });
    expect(crmSyncPatch(row, [crm('booking_confirmation', { language: 'en' })], NOW)).not.toHaveProperty('status');
  });

  it('by crm_name / crm_language: status only, the other template\'s id is never the row\'s', () => {
    const row = templateRow({ crm_name: 'booking_v2', crm_language: 'ar_EG', meta_id: 'own-id' });
    const patch = crmSyncPatch(row, [crm('booking_v2', { language: 'ar_EG', status: 'REJECTED', rejectedReason: 'x' })], NOW);
    expect(patch).toMatchObject({ status: 'rejected', last_error: 'x' });
    expect(patch).not.toHaveProperty('meta_id');
  });

  it('a CRM row without a Meta id keeps the row\'s own', () => {
    const patch = crmSyncPatch(templateRow({ meta_id: 'own-id' }), [crm('booking_confirmation', { id: '' })], NOW);
    expect(patch).not.toHaveProperty('meta_id');
  });
});
