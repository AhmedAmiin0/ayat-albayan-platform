import type {
  ShortLinkDetail, ShortLinkGateView, ShortLinkPerson, ShortLinkUser, ShortLinkVisitor,
} from '@ab/shared';

// Test data shaped like the API's answers (docs/19 «Managed links»).

const ID = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';

export const person: ShortLinkPerson = { id: ID, name: 'أحمد علي', role: 'guardian', phone: null };

export const listedUser: ShortLinkUser = {
  id: ID,
  person: { id: ID, name: 'أحمد علي', role: 'guardian' },
  phone: '+966550000001',
  sendStatus: 'queued',
  sendError: null,
  sentAt: '2026-11-16T10:00:00.000Z',
};

export const typedUser: ShortLinkUser = {
  id: ID2,
  person: null,
  phone: '+201120000003',
  sendStatus: 'failed',
  sendError: 'template_not_approved',
  sentAt: null,
};

export const accountVisit: ShortLinkVisitor = {
  kind: 'user',
  person: { id: ID, name: 'أحمد علي', role: 'guardian' },
  phone: null,
  family: null,
  firstAt: '2026-11-16T15:20:00.000Z',
  lastAt: '2026-11-16T15:20:00.000Z',
  opens: 3,
};

export const detail: ShortLinkDetail = {
  code: 'K7q2M9xT',
  title: 'لقاء أولياء الأمور',
  shortUrl: 'https://app.ayatalbayan.com/l/K7q2M9xT',
  targetUrl: 'https://meet.google.com/kdw-pqhr-xab',
  status: 'active',
  audience: 'listed',
  maxUsers: 12,
  sendWhatsapp: true,
  expiresAt: '2026-11-20T11:06:00.000Z',
  createdAt: '2026-11-13T11:06:00.000Z',
  createdBy: { id: ID2, name: 'أحمد', role: 'admin' },
  users: 2,
  visitors: 1,
  userList: [listedUser, typedUser],
  visitorList: [accountVisit],
};

export const gateView: ShortLinkGateView = {
  title: 'لقاء أولياء الأمور',
  state: 'open',
  goneReason: null,
  needs: 'sign_in_or_code',
  codesAvailable: true,
};
