import type { ShortLinkDetail, ShortLinkPerson, ShortLinkRow } from '@ab/shared';
import { pathKey } from '@ab/mobile-kit';
import { createTestQueryClient } from '@/test/query';
import { fullAccessMe } from '@/test/staff-me';

// Test answers shaped like the API's (docs/19 «Managed links»): parsed by the shared zod schemas.

export const ME = '11111111-1111-4111-8111-111111111111';
export const OTHER = '22222222-2222-4222-8222-222222222222';
const GUARDIAN = '33333333-3333-4333-8333-333333333333';
const TEACHER = '44444444-4444-4444-8444-444444444444';

const DAY = 86_400_000;
const inDays = (days: number): string => new Date(Date.now() + days * DAY).toISOString();

const CODE = 'K7q2M9xT';

export const row = (patch: Partial<ShortLinkRow> = {}): ShortLinkRow => ({
  code: CODE,
  title: 'لقاء أولياء الأمور الشهري',
  shortUrl: `https://app.ayatalbayan.com/l/${patch.code ?? CODE}`,
  targetUrl: 'https://meet.google.com/xpr-hmkd-qtz',
  status: 'active',
  audience: 'listed',
  maxUsers: 5,
  sendWhatsapp: true,
  expiresAt: inDays(7),
  createdAt: inDays(-1),
  createdBy: { id: OTHER, name: 'الزهراء', role: 'sales' },
  users: 2,
  visitors: 1,
  ...patch,
});

export const detail = (patch: Partial<ShortLinkDetail> = {}): ShortLinkDetail => ({
  ...row(),
  userList: [
    {
      id: GUARDIAN,
      person: { id: GUARDIAN, name: 'أحمد علي', role: 'guardian' },
      phone: null,
      sendStatus: 'queued',
      sendError: null,
      sentAt: inDays(-1),
    },
    {
      id: OTHER,
      person: null,
      phone: '+201000000001',
      sendStatus: 'failed',
      sendError: 'template_not_approved',
      sentAt: null,
    },
  ],
  visitorList: [
    {
      kind: 'user',
      person: { id: GUARDIAN, name: 'أحمد علي', role: 'guardian' },
      phone: null,
      family: null,
      firstAt: inDays(-0.5),
      lastAt: inDays(-0.5),
      opens: 2,
    },
  ],
  ...patch,
});

export const people: ShortLinkPerson[] = [
  { id: GUARDIAN, name: 'أحمد علي', role: 'guardian', phone: null },
  { id: TEACHER, name: 'حسن إبراهيم', role: 'teacher', phone: null },
];

export function clientWithMe() {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { ...fullAccessMe(), id: ME });
  return client;
}
