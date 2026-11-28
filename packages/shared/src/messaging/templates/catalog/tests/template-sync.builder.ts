import type { TemplateLineSync } from '../template-sync.schemas';

/** One line's successful sync, as the api stores and answers it. */
export const aLineSync = (patch: Partial<TemplateLineSync> = {}): TemplateLineSync => ({
  line: 'chat',
  configured: true,
  provider: 'meta',
  waba_id: '1',
  phone_number_id: '2',
  ok: true,
  checked_at: '2026-11-27T10:00:00.000Z',
  meta_count: 3,
  synced: 2,
  imported: ['offer_x'],
  skipped: [{ name: 'promo', reason: { code: 'category', category: 'MARKETING' } }],
  ...patch,
});
