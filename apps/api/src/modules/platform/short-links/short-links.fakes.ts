import type { ShortLinkRow } from './short-links.repo';

const NOW = '2026-11-17T12:00:00.000Z';

/** A whole short_links row for tests: a system link (teacher_report) unless overridden. */
export const linkRow = (over: Partial<ShortLinkRow> = {}): ShortLinkRow => ({
  id: '00000000-0000-4000-8000-00000000a001',
  code: 'Ab12Cd34Ef',
  target_url: 'https://app.example.com/teacher-report/t',
  kind: 'teacher_report',
  subject: 'l1',
  created_at: NOW,
  expires_at: null,
  created_by: null,
  title: null,
  max_users: null,
  audience: 'anyone',
  send_whatsapp: false,
  status: 'active',
  ...over,
});

/** A managed link (kind managed, subject = code) made by `owner`. */
export const managedRow = (over: Partial<ShortLinkRow> = {}): ShortLinkRow =>
  linkRow({
    kind: 'managed',
    subject: over.code ?? 'Ab12Cd34Ef',
    title: 'رابط التسجيل',
    target_url: 'https://app.example.com/register',
    expires_at: '2026-11-24T12:00:00.000Z',
    created_by: '00000000-0000-4000-8000-0000000000b1',
    ...over,
  });
