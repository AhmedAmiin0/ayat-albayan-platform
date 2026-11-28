import { formatPhone } from '@ab/core';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ltr, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { childHref } from '@/nav';
import { student } from '@/portal/portal.fixtures';
import { ProfileScreen } from './ProfileScreen';

const mockAnswers: Record<string, unknown> = {};
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? '']),
}));

// A made-up number (the sign-in tests use it too).
const PHONE = '+966500000005';
const profile = (over: Record<string, unknown>) => ({
  id: '0b6f1a52-6d1e-4c43-9a37-3c5c8f1e2a10',
  full_name: 'أم سارة',
  email: null,
  phone_e164: PHONE,
  avatar_url: null,
  role: { base: null, key: null, name_ar: null, name_en: null },
  ...over,
});
const answer = (me: unknown, prof: unknown) => {
  mockAnswers['/portal/me'] = me;
  mockAnswers['/me/profile'] = prof;
};
const P = t.portal.app.profile;

beforeEach(() => jest.clearAllMocks());

const show = async () => {
  await renderWithQuery(<ProfileScreen />, freshQueryClient());
  await screen.findByText(P.details);
};

test('a guardian: the WhatsApp number, the children, never a placeholder email', async () => {
  const kid = student();
  answer(
    { kind: 'guardian', students: [kid], renew_url: null },
    profile({ email: 'p1@family.invalid' }),
  );
  await show();
  expect(screen.getByText(t.portal.app.account.guardian)).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone(PHONE)))).toBeTruthy();
  expect(screen.queryByText(P.email)).toBeNull();
  expect(screen.queryByText(/\.invalid/)).toBeNull();
  expect(screen.queryByText(P.code)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(kid.name) }));
  expect(router.push).toHaveBeenCalledWith(childHref(kid.id));
});

test('a student: their code and a real email, no children', async () => {
  const self = student({ contact_is_self: true });
  answer(
    { kind: 'student', students: [self], renew_url: null },
    profile({ full_name: self.name, email: 'Student@Example.com', phone_e164: null }),
  );
  await show();
  expect(screen.getByText(ltr(self.code))).toBeTruthy();
  expect(screen.getByText(ltr('Student@Example.com'))).toBeTruthy();
  expect(screen.queryByText(P.whatsapp)).toBeNull();
  expect(screen.queryByText(t.portal.app.account.children)).toBeNull();
  expect(screen.getByText(P.note)).toBeTruthy();
});
