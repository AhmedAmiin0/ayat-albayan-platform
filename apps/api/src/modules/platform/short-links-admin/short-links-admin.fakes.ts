import type { ShortLinkRow } from '@/modules/platform/short-links';

/** A whole managed short_links row for tests (kind managed, subject = code). */
export const managedRow = (over: Partial<ShortLinkRow> = {}): ShortLinkRow => ({
  id: '00000000-0000-4000-8000-00000000e001',
  code: 'Mg12Cd34Ef',
  subject: over.code ?? 'Mg12Cd34Ef',
  kind: 'managed',
  title: 'رابط التسجيل',
  target_url: 'https://app.example.com/register',
  created_at: '2026-11-17T12:00:00.000Z',
  expires_at: '2026-11-24T12:00:00.000Z',
  created_by: '00000000-0000-4000-8000-0000000000b1',
  max_users: null,
  audience: 'anyone',
  send_whatsapp: false,
  status: 'active',
  ...over,
});
