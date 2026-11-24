import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { t, queryClient, pathKey } from '@ab/mobile-kit';
import Tabs from '../../app/(tabs)/_layout';
import Home from '../../app/(tabs)/index';
import Reports from '../../app/(tabs)/reports';
import Child from '../../app/child/[id]';
import PickChild from '../../app/pick-child';
import Layout from '../../app/_layout';
import Login from '../../app/login';

// docs/50 §7: signed in goes to the tabs, out to sign-in; role rules live in their own test.

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
  '(tabs)/reports': Reports,
  '(tabs)/account': Blank,
  'child/[id]': Child,
  'pick-child': PickChild,
};
const kid = (id: string, name: string) => ({
  id, code: `AB-000${id.slice(1)}`, name, tz: 'Asia/Riyadh', contact_is_self: false,
});
const sara = kid('s1', 'سارة');
const yusuf = kid('s2', 'يوسف');
const EMPTY: Record<string, unknown> = {
  lessons: { lessons: [], prepare: null, month: { attended: 2, absent: 1 } },
  reports: { reports: [] },
  package: { package: null, payments: [], payment_instructions: '' },
  history: { rows: [], next_cursor: null },
};
const studentRead = (path: string): unknown => EMPTY[path.split('?')[0]?.split('/')[4] ?? ''];

interface SignIn {
  gate: string;
  kind?: string;
  students?: ReturnType<typeof kid>[];
  /** The profile id (a saved pick is this profile's only). */
  id?: string;
  url?: string;
}

/** Signs in as `gate` with /portal/me listing `students` (one child by default). */
function open({ gate, kind = 'guardian', students = [sara], id = 'g1', url = '/' }: SignIn) {
  const me = { id, role: kind, permissions: ['self.portal'] };
  mockApiFetch.mockImplementation(async (path: string) => {
    const body: Record<string, unknown> = {
      '/auth/me': me,
      '/portal/me': { kind, students, renew_url: null },
      '/auth/code/status': { available: true, staff: false },
    };
    return (
      body[path] ?? studentRead(path) ?? { items: [], total: 0, page: 1, pageSize: 20, unread: 0 }
    );
  });
  mockGate.initial = gate;
  if (gate !== 'out') queryClient.setQueryData(pathKey('/auth/me'), me);
  return renderRouter(routes, { initialUrl: url });
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
});

test("a guardian of one child: that child's page with «الباقة», no picker", async () => {
  const guardian = open({ gate: 'guardian' });
  await guardian;
  expect(await screen.findByRole('tab', { name: t.portal.packageTab })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'سارة' })).toBeTruthy();
  expect(await screen.findByText(t.portal.app.tabs.reports)).toBeTruthy();
  expect(guardian.getPathname()).toBe('/');
  expect(registerPush).toHaveBeenCalled();
});

test('signed out: the family sign-in, no push registration', async () => {
  await open({ gate: 'out' });
  expect(await screen.findByText(t.familyApp.signIn.withPassword)).toBeTruthy();
  expect(screen.getByLabelText(t.familyAuth.phone)).toBeTruthy();
  expect(registerPush).not.toHaveBeenCalled();
});

test('two children, none picked: «اختر الطالب»; a card makes the app that child', async () => {
  const guardian = open({ gate: 'guardian', students: [sara, yusuf], id: 'g-two' });
  await guardian;
  expect(await screen.findByText(t.portal.app.pick.hint)).toBeTruthy();
  expect(guardian.getPathname()).toBe('/pick-child');
  await fireEvent.press(await screen.findByRole('button', { name: /يوسف/ }));
  expect(await screen.findByRole('header', { name: 'يوسف' })).toBeTruthy();
  expect(guardian.getPathname()).toBe('/');
  await fireEvent.press(await screen.findByText(t.portal.app.tabs.reports));
  expect(await screen.findByText(t.portal.app.reports.empty)).toBeTruthy();
});

test('a link to a child opens with no pick (never filtered by it)', async () => {
  const students = [sara, yusuf];
  const guardian = open({ gate: 'guardian', students, id: 'g-link', url: '/child/s2' });
  await guardian;
  expect(await screen.findByText('AB-0002')).toBeTruthy();
  expect(guardian.getPathname()).toBe('/child/s2');
});

test('a student lands on their own page: their tabs, no package, never the picker', async () => {
  await open({ gate: 'student', kind: 'student' });
  expect(await screen.findByText(t.portal.app.child.attendedSelf)).toBeTruthy();
  expect(screen.getByText(t.portal.app.tabs.reports)).toBeTruthy();
  expect(screen.queryByText(t.portal.packageTab)).toBeNull();
});

test('signing out (the gate flips to out) swaps home for the sign-in', async () => {
  await open({ gate: 'guardian' });
  expect(await screen.findByRole('header', { name: 'سارة' })).toBeTruthy();
  await act(async () => mockGate.set('out'));
  expect(await screen.findByText(t.familyApp.signIn.withPassword)).toBeTruthy();
});
