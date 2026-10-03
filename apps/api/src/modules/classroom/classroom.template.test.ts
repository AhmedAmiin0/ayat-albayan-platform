import { describe, expect, it } from 'vitest';
import { AUTOMATIC_KEYS } from '../whatsapp/send-stale';
import { JOIN_LINK_TEMPLATE } from './join-link.service';

describe('lesson_join_link is an admin action only', () => {
  it('is never an automatic template (no job may send or hold it)', () => {
    expect(AUTOMATIC_KEYS).not.toContain(JOIN_LINK_TEMPLATE);
  });

  it('uses the key seeded by migration 182', () => {
    expect(JOIN_LINK_TEMPLATE).toBe('lesson_join_link');
  });
});
