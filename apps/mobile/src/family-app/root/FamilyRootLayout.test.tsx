import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { t } from '@/core/lib/i18n/i18n';
import { queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import Child from '../../../app-family/child/[id]';
import Home from '../../../app-family/index';
import Layout from '../../../app-family/_layout';
import Login from '../../../app-family/login';
import Settings from '../../../app-family/settings';

// docs/50 §7: the family app's own router root. Signed in (guardian / student) → home; out → the
// sign-in. The gate is a settable status here (its role rules: verify-role.family.test.ts).

const mockApiFetch = jest.fn();
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@/core/lib/app-kind', () => ({ appKind: () => 'family' }));
jest.mock('@/core/push/registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@/core/auth/use-auth-gate', () => {
  const { useState } = jest.requireActual('react');
  const gate = { initial: 'out', set: (() => undefined) as (mockStatus: string) => void };
  return {
    mockGate: gate,
    useAuthGate: () => {
      const [status, set] = useState(gate.initial);
      gate.set = set;
      return status;
    },
  };
});
const { mockGate } = jest.requireMock<{
  mockGate: { initial: string; set: (status: string) => void };
}>('@/core/auth/use-auth-gate');
const { registerPush } = jest.requireMock<{ registerPush: jest.Mock }>(
  '@/core/push/registerPush',
);

const routes = {
  _layout: Layout,
  index: Home,
  login: Login,
  settings: Settings,
  'child/[id]': Child,
  // The room (docs/35) is the staff app's own screen: a stub here, its tests are its own.
  'room/[kind]/[id]': () => null,
};
const me = { id: 'g1', role: 'guardian', permissions: ['self.portal'] };
const children = [
  { id: 's1', code: 'AB-0001', name: 'سارة' },
  { id: 's2', code: 'AB-0002', name: 'يوسف' },
];

const answer = (kind: string) =>
  mockApiFetch.mockImplementation(async (path: string) => {
    const body: Record<string, unknown> = {
      '/auth/me': me,
      '/portal/me': { kind, students: kind === 'student' ? [children[0]] : children },
      '/auth/code/status': { available: true, staff: false },
    };
    return body[path] ?? {};
  });

function open(gate: string, kind = 'guardian') {
  answer(kind);
  mockGate.initial = gate;
  if (gate !== 'out') queryClient.setQueryData(pathKey('/auth/me'), me);
  return renderRouter(routes, { initialUrl: '/' });
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
});

test('a guardian lands on home: one card per child, and this device registers for pushes', async () => {
  await open('guardian');
  expect(await screen.findByText('سارة')).toBeTruthy();
  expect(screen.getByText('يوسف')).toBeTruthy();
  expect(screen.getByRole('header', { name: t.familyApp.home.title })).toBeTruthy();
  expect(registerPush).toHaveBeenCalled();
});

test('signed out: the family sign-in, no push registration', async () => {
  await open('out');
  expect(await screen.findByText(t.familyApp.signIn.guardian)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.familyApp.signIn.title })).toBeTruthy();
  expect(registerPush).not.toHaveBeenCalled();
});

test('a card opens child/[id]', async () => {
  const guardian = open('guardian');
  await guardian;
  await fireEvent.press(await screen.findByRole('button', { name: /يوسف/ }));
  expect(guardian.getPathname()).toBe('/child/s2');
});

test('a student lands on their own page directly (no list)', async () => {
  const student = open('student', 'student');
  await student;
  expect(await screen.findByText(t.familyApp.child.soon)).toBeTruthy();
  expect(student.getPathname()).toBe('/child/s1');
});

test('signing out (the gate flips to out) swaps home for the sign-in', async () => {
  await open('guardian');
  expect(await screen.findByText('سارة')).toBeTruthy();
  await act(async () => mockGate.set('out'));
  expect(await screen.findByText(t.familyApp.signIn.student)).toBeTruthy();
});
