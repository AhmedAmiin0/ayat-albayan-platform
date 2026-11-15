import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { t, queryClient, pathKey } from '@ab/mobile-kit';
import Tabs from '../../app/(tabs)/_layout';
import Home from '../../app/(tabs)/index';
import Child from '../../app/child/[id]';
import Layout from '../../app/_layout';
import Login from '../../app/login';

// docs/50 §7: the family app's own router root. Signed in (guardian / student) → the tabs' home;
// out → the sign-in. The gate is a settable status here (role rules: verify-role.family.test.ts).

const mockApiFetch = jest.fn();
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@ab/mobile-kit/push/registerPush', () => ({
  registerPush: jest.fn(async () => undefined),
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@ab/mobile-kit/auth/use-auth-gate', () => {
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
}>('@ab/mobile-kit/auth/use-auth-gate');
const { registerPush } = jest.requireMock<{ registerPush: jest.Mock }>(
  '@ab/mobile-kit/push/registerPush',
);

const Blank = () => null;
const routes = {
  _layout: Layout,
  login: Login,
  '(tabs)/_layout': Tabs,
  '(tabs)/index': Home,
  '(tabs)/schedule': Blank,
  '(tabs)/children': Blank,
  '(tabs)/reports': Blank,
  '(tabs)/account': Blank,
  'child/[id]': Child,
};
const me = { id: 'g1', role: 'guardian', permissions: ['self.portal'] };
const kid = (id: string, name: string) => ({
  id,
  code: `AB-000${id.slice(1)}`,
  name,
  tz: 'Asia/Riyadh',
  contact_is_self: false,
});
const children = [kid('s1', 'سارة'), kid('s2', 'يوسف')];
const EMPTY: Record<string, unknown> = {
  lessons: { lessons: [], prepare: null, month: { attended: 2, absent: 1 } },
  reports: { reports: [] },
  package: { package: null, payments: [], payment_instructions: '' },
  history: { rows: [], next_cursor: null },
};
const studentRead = (path: string): unknown => EMPTY[path.split('?')[0]?.split('/')[4] ?? ''];

const answer = (kind: string) =>
  mockApiFetch.mockImplementation(async (path: string) => {
    const body: Record<string, unknown> = {
      '/auth/me': me,
      '/portal/me': {
        kind,
        students: kind === 'student' ? [children[0]] : children,
        renew_url: null,
      },
      '/auth/code/status': { available: true, staff: false },
    };
    return (
      body[path] ?? studentRead(path) ?? { items: [], total: 0, page: 1, pageSize: 20, unread: 0 }
    );
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
  expect(screen.getByRole('header', { name: t.portal.app.home.greeting })).toBeTruthy();
  expect(screen.getByText(t.portal.app.tabs.children)).toBeTruthy();
  expect(registerPush).toHaveBeenCalled();
});

test('signed out: the family sign-in, no push registration', async () => {
  await open('out');
  expect(await screen.findByText(t.familyApp.signIn.withPassword)).toBeTruthy();
  expect(screen.getByLabelText(t.familyAuth.phone)).toBeTruthy();
  expect(registerPush).not.toHaveBeenCalled();
});

test("a card's head opens child/[id]", async () => {
  const guardian = open('guardian');
  await guardian;
  await fireEvent.press(await screen.findByRole('button', { name: /يوسف/ }));
  expect(guardian.getPathname()).toBe('/child/s2');
});

test('a student lands on their own page: their tabs, no «أبنائي»', async () => {
  await open('student', 'student');
  expect(await screen.findByText(t.portal.app.child.attendedSelf)).toBeTruthy();
  expect(screen.getByText(t.portal.app.tabs.reports)).toBeTruthy();
  expect(screen.queryByText(t.portal.app.tabs.children)).toBeNull();
  expect(screen.queryByText(t.portal.packageTab)).toBeNull();
});

test('signing out (the gate flips to out) swaps home for the sign-in', async () => {
  await open('guardian');
  expect(await screen.findByText('سارة')).toBeTruthy();
  await act(async () => mockGate.set('out'));
  expect(await screen.findByText(t.familyApp.signIn.withPassword)).toBeTruthy();
});
