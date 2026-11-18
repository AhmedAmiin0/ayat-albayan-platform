import type { ShortLinkDetail, ShortLinkRow } from '@ab/shared';

// Tests only: API answers shaped like GET /short-links and GET /short-links/:code (docs/19).

export const OWNER_ID = '11111111-1111-4111-8111-111111111111';
export const USER_ID = '22222222-2222-4222-8222-222222222222';
export const PHONE_ID = '33333333-3333-4333-8333-333333333333';

const DAY = 86_400_000;
const inDays = (days: number): string => new Date(Date.now() + days * DAY).toISOString();

export const linkRow = (over: Partial<ShortLinkRow> = {}): ShortLinkRow => ({
  code: 'K7q2M9xT',
  title: 'لقاء أولياء الأمور',
  shortUrl: 'https://app.ayatalbayan.com/l/K7q2M9xT',
  targetUrl: 'https://meet.google.com/kdw-pqhr-xab',
  status: 'active',
  audience: 'listed',
  maxUsers: 12,
  sendWhatsapp: true,
  expiresAt: inDays(3),
  createdAt: inDays(-4),
  createdBy: { id: OWNER_ID, name: 'هالة منصور', role: 'admin' },
  users: 2,
  visitors: 1,
  ...over,
});

export const linkDetail = (over: Partial<ShortLinkDetail> = {}): ShortLinkDetail => ({
  ...linkRow(),
  userList: [
    {
      id: USER_ID,
      person: { id: USER_ID, name: 'عمر سعيد', role: 'student' },
      phone: null,
      sendStatus: 'failed',
      sendError: 'template_not_approved',
      sentAt: null,
    },
    {
      id: PHONE_ID,
      person: null,
      phone: '+201120000003',
      sendStatus: 'not_sent',
      sendError: null,
      sentAt: null,
    },
  ],
  visitorList: [
    {
      kind: 'phone',
      person: null,
      phone: '+201120000003',
      family: null,
      firstAt: inDays(-1),
      lastAt: inDays(-1),
      opens: 2,
    },
  ],
  ...over,
});
