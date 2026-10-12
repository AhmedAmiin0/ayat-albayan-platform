import { describe, expect, it } from 'vitest';
import { AUTOMATIC_KEYS, isAutomatic } from '../whatsapp/send-stale';
import { JOIN_LINK_TEMPLATE } from './join-link.service';

describe('lesson_join_link: the admin send and the reminders job (settings.meeting_link_auto)', () => {
  it('the job-made row is automatic (held while automatic messages are OFF); the admin send never is', () => {
    expect(AUTOMATIC_KEYS).toContain(JOIN_LINK_TEMPLATE);
    expect(isAutomatic({ template_key: JOIN_LINK_TEMPLATE, created_by: null })).toBe(true);
    expect(isAutomatic({ template_key: JOIN_LINK_TEMPLATE, created_by: 'a0000000-0000-4000-8000-000000000001' })).toBe(false);
  });

  it('uses the key seeded by migration 182', () => {
    expect(JOIN_LINK_TEMPLATE).toBe('lesson_join_link');
  });
});
